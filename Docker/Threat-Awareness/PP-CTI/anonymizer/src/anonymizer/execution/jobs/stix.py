# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from json import dumps, loads
from types import SimpleNamespace
from typing import Any, override

from misp_stix_converter import (
    MISPtoSTIX21Parser,
    MISPtoSTIX20Parser,
    MISPtoSTIX1EventsParser,
)

from anonymizer.config import log
from anonymizer.execution.exceptions import JobError
from anonymizer.execution.jobs import GeneratorJob, Job, JsonReply
from anonymizer.models.misp import Event


class StixJob(Job):
    """Abstract class for STIX-related jobs to inherit from.

    - stix_version (Optional)
    - `str`

    An alternative STIX version to use.  By default, STIX 2.1 is used
    for everything.  Valid inputs: '1.1.1', '1.2', '2.0', '2.1'
    """

    PARAM_STXV = 'stix_version'

    def __init__(self, name: str,
                 env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None,
                 ):
        super().__init__(name, env, args, generator)


class StixPong(JsonReply):
    """Set the HTTP response as a STIX object.

    - object_location
    - `str`

    The location of the STIX object to reply with.
    """

    PARAM_OBJL = 'object_location'

    @override
    def json_body(self, **kwargs) -> dict:
        self.verify_parameters(kwargs, self.PARAM_OBJL)
        location = kwargs[self.PARAM_OBJL]
        objectt = self.get_from_env(location, dict)
        try:
            dumps(objectt)
        except (TypeError, OverflowError) as e:
            msg = 'Unserializable STIX object'
            raise JobError(msg) from e
        else:
            return objectt


class TransformMISPEvent(StixJob):
    """Transform an existing MISP event into a STIX object.

    - event_location
    - `str`

    The location of the MISP event.  This location must contain an
    object of type anonymizer.models.misp.Event.

    - destination
    - `str`

    The location where the STIX object will end up.  If this location
    already contains something, it will be overriden.

    - stix_version (Optional)
    - `str`

    An alternative STIX version to use.  By default, STIX 2.1 is used
    for everything.
    """

    PARAM_EVTL = 'event_location'
    PARAM_DEST = 'destination'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs,
                               self.PARAM_EVTL,
                               self.PARAM_DEST)
        location = kwargs[self.PARAM_EVTL]
        destination = kwargs[self.PARAM_DEST]
        stix_version: str = kwargs.get(self.PARAM_STXV, '2.1')

        log.info('Job %s: Retrieving MISP event',
                 self.name)
        event = self.get_from_env(location, Event)
        event_dict = event.model_dump(by_alias=True)

        parser = None
        if stix_version is None:
            parser = MISPtoSTIX21Parser()
        else:
            if stix_version.startswith('1'):
                orgname = 'Test'
                version = ('1.1.1'
                           if stix_version not in ['1.1.1', '1.2']
                           else stix_version)
                parser = MISPtoSTIX1EventsParser(
                    orgname,
                    version,
                )
            elif stix_version == '2.1':
                parser = MISPtoSTIX21Parser()
            elif stix_version == '2.0':
                parser = MISPtoSTIX20Parser()
            else:
                msg = 'Invalid STIX version'
                raise JobError(msg)

        log.info('Job %s: Parsing MISP event',
                 self.name)
        log.debug('Job %s: MISP event: %s',
                  self.name,
                  event.model_dump_json(by_alias=True))
        try:
            parser.parse_misp_event(event_dict)
        except KeyError as e:
            msg = 'Missing required field in MISP event'
            raise JobError(msg) from e

        log.info('Job %s: Storing STIX object in location "%s"',
                 self.name,
                 destination)

        if isinstance(parser, MISPtoSTIX1EventsParser):
            result = loads(parser.stix_package.to_json())
        else:
            result = loads(parser.bundle.serialize())

        try:
            existing = self.get_from_env(destination)
            log.warning('Job "%s": Overriding existing object of type %s',
                      self.name,
                      type(existing))
        except JobError:
            pass
        setattr(self.env, destination, result)
