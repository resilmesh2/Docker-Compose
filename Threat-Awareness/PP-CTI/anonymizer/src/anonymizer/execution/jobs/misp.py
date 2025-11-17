# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from json import dumps, loads
from types import SimpleNamespace
from typing import Any

from pymisp.exceptions import NewEventError
from typing import override

from anonymizer.clients import ClientError
from anonymizer.clients.misp import MISPClient
from anonymizer.config import config, log
from anonymizer.execution.exceptions import JobError
from anonymizer.execution.jobs import GeneratorJob, Job, JsonReply
from anonymizer.models.base import Model
from anonymizer.models.data_model import Request
from anonymizer.models.misp import VERSION, Event, EventAnon
from anonymizer.transformers.misp import MispTransformer


class MispJob(Job):
    """Abstract class for MISP-related jobs to inherit from.

    - misp_url (Optional)
    - `str`

    An alternative URL to send the MISP requests to.

    - misp_key (Optional)
    - `str`

    An alternative MISP key to use.

    - misp_ssl (Optional)
    - `bool`

    Whether the connection should be done with SSL.
    """

    PARAM_URLM = 'misp_url'
    PARAM_KEYM = 'misp_key'
    PARAM_SSLM = 'misp_ssl'

    def __init__(self, name: str,
                 env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None,
                 ):
        super().__init__(name, env, args, generator)


class MispPong(JsonReply):
    """Set the HTTP response as a MISP object.

    - object_location
    - `str`

    The location of the MISP object to reply with.  This location must
    contain an object defined within the anonymizer.models.misp
    package.
    """

    PARAM_OBJL = 'object_location'

    @override
    def json_body(self, **kwargs) -> dict:
        self.verify_parameters(kwargs, self.PARAM_OBJL)
        location = kwargs[self.PARAM_OBJL]
        objectt = self.get_from_env(location, Model)
        # We won't do any validation to ensure the object comes from
        # anonymizer.models.misp, because that requirement is only
        # there so that we're sure we can JSON serialize it.
        body = objectt.model_dump_json(by_alias=True)
        return loads(body)


class UpdateEvent(Job):
    """Update a pre-existing MISP event with the Request values.

    - event_location
    - `str`

    The location of the MISP event to update in the request context.
    This location must contain an object of type
    anonymizer.models.misp.EventAnon.
    """

    PARAM_EVTL = 'event_location'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs, self.PARAM_EVTL)
        location = kwargs[self.PARAM_EVTL]
        # We will use the update() method of MispTransformer simply
        # because it's already implemented here
        event = self.get_from_env(location, EventAnon)
        temp_transformer = MispTransformer()
        log.info('Job "%s": Updating event', self.name)
        log.debug('Job "%s": Data: %s',
                  self.name, dumps(Request.to_dict(self.data())))
        updated = temp_transformer.update(event, self.data())
        log.info('Job "%s": Was the event updated? %s', self.name, updated)


class PostEvent(MispJob):
    """Upload an event to MISP.

    - event_location
    - `str`

    The location of the MISP event to upload.  By default, the job
    will assume that this location contains an object of type
    anonymizer.models.misp.Event.

    - publish
    - `bool`

    Whether to also publish the MISP event or not.

    - event_anon (Optional)
    - `bool`

    Whether the event_location parameter points to an object of type
    anonymizer.models.misp.EventAnon.  Defaults to False.

    - misp_url (Optional)
    - `str`

    An alternative URL to send the MISP requests to.

    - misp_key (Optional)
    - `str`

    An alternative MISP key to use.

    - misp_ssl (Optional)
    - `bool`

    Whether the connection should be done with SSL.
    """

    PARAM_EVTL = 'event_location'
    PARAM_PUBL = 'publish'
    PARAM_EVAN = 'event_anon'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs, self.PARAM_EVTL, self.PARAM_PUBL)
        location = kwargs[self.PARAM_EVTL]
        publish = bool(kwargs[self.PARAM_PUBL])
        event_anon = bool(kwargs.get(self.PARAM_EVAN))
        url = kwargs.get(self.PARAM_URLM,
                         config.services.misp.url.unicode_string())
        key = kwargs.get(self.PARAM_KEYM,
                         config.services.misp.key.get_secret_value())
        ssl = bool(kwargs.get(self.PARAM_SSLM,
                              config.services.misp.ssl))

        event_type = Event if not event_anon else EventAnon
        event = self.get_from_env(location, event_type)
        if isinstance(event, EventAnon):
            event = event.event

        try:
            async with MISPClient(url, key, ssl) as client:
                try:
                    log.info('Job "%s": Uploading to MISP URL %s',
                             self.name,
                             client.url)
                    success = await client.post_event(event, publish)
                    if success:
                        log.info('Job "%s": Uploaded event to MISP URL %s',
                                 self.name,
                                 client.url)

                        # Update audit information
                        def update_misp_event_audit(old_audit: dict) -> dict:
                            old_audit['uploaded'] = True
                            old_audit['published'] = publish
                            return old_audit

                        await self.request().app.ctx.valkey.update_audit(
                            self.env.audit_timestamp,
                            update_misp_event_audit,
                        )
                    else:
                        msg = 'Unable to upload MISP event'
                        raise JobError(msg)
                except NewEventError as e:
                    log.error('Job "%s": Unable to upload MISP event',
                              self.name)
                    log.debug('Job "%s": MISP client raised exception',
                              self.name)
                    msg = 'Exception while publishing MISP event'
                    raise JobError(msg) from e
        except ClientError as e:
            msg = 'Client exception raised'
            raise JobError(msg) from e


class ExtractEventFromEventAnon(Job):
    """Extract a MISP event from an EventAnon instance.

    - source
    - `str`

    The location of the EventAnon.  This location must contain an
    object of type anonymizer.models.misp.EventAnon.

    - destination
    - `str`

    The location where the MISP event will end up.  If this location
    already contains something, it will be overriden.
    """

    PARAM_SRCE = 'source'
    PARAM_DEST = 'destination'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_SRCE,
                               self.PARAM_DEST)
        source = kwargs[self.PARAM_SRCE]
        destination = kwargs[self.PARAM_DEST]
        eventanon = self.get_from_env(source, EventAnon)
        event = eventanon.event
        log.debug('Job "%s": Obtained event is %s',
                  self.name,
                  event)
        log.info('Job "%s": Storing MISP event in location "%s"',
                 self.name,
                 destination)
        try:
            existing = self.get_from_env(destination)
            log.warning('Job "%s": Overriding existing object of type %s',
                      self.name,
                      type(existing))
        except JobError:
            pass
        setattr(self.env, destination, event)
