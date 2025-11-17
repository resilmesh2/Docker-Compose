# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from typing import override
from pymisp.api import PyMISP
from pymisp.exceptions import PyMISPError

from anonymizer.clients import Client, ClientInitializationError
from anonymizer.config import config, log
from anonymizer.models.misp import Event, EventMISP


class MISPClient(Client[PyMISP]):
    def __init__(
        self,
        url: str | None = None,
        key: str | None = None,
        ssl: bool | None = None,
    ) -> None:
        super().__init__(config.services.misp.connection)
        if url is not None:
            self.url = url
        else:
            self.url = config.services.misp.url.encoded_string()

        if key is not None:
            self.key = key
        else:
            self.key = config.services.misp.key.get_secret_value()

        if ssl is not None:
            self.ssl = ssl
        else:
            self.ssl = config.services.misp.ssl

    @override
    async def _start(self) -> PyMISP:
        def _inner() -> PyMISP:
            return PyMISP(self.url, self.key, self.ssl)

        def _otherwise(e: list[Exception]) -> PyMISP:
            msg = 'Exception while initializing MISP client'
            raise ClientInitializationError(msg) from e[-1]

        client = await self.retry(
            _inner,
            until=(PyMISPError,),
            otherwise=_otherwise,
        )
        if client is None:
            msg = 'Unable to initialize MISP client'
            raise ClientInitializationError(msg)
        return client

    @override
    async def _stop(self, _: PyMISP):
        pass

    def _check_results(self, d: dict) -> bool:
        if 'errors' in d:
            log.error('There was an error while interacting with MISP')
            if isinstance(d['errors'], str):
                log.error('Error message: %s', d['errors'])
                return False
            error_code = d['errors'][0]
            error_info = d['errors'][1]
            log.error('Error code: %s', error_code)
            if 'name' in error_info:
                log.error('Error name: %s', error_info['name'])
            if 'message' in error_info:
                log.error('Error message: %s', error_info['message'])
            if 'url' in error_info:
                log.error('At URL: %s', error_info['url'])
            return False
        return True

    def get_version(self) -> str:
        """Return the MISP instance version."""
        return self.client.misp_instance_version['version']

    async def post_event(self, event: Event, publish: bool) -> dict:
        """Publish an event.

        Returns `False` if the event couldn't be published, `True`
        otherwise.
        """
        misp_event = event.to_misp_event()
        res = self.client.add_event(misp_event)
        if isinstance(res, dict):
            return self._check_results(res)
        if publish:
            res = self._client.publish(misp_event)
            return self._check_results(res)
        return True

    async def get_event(self, event_id: str) -> Event | None:
        """Retrieve an event from the MISP instance.

        Returns `None` if the event couldn't be found.
        """
        event = self._client.get_event(event_id)
        if isinstance(event, dict):
            self._check_results(event)
            return None
        return EventMISP.model_validate(event.to_dict()).event
