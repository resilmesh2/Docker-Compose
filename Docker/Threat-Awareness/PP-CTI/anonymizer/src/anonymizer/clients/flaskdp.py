# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from dataclasses import dataclass
from json import loads
from urllib.parse import urljoin

from aiohttp import ClientError

from anonymizer.clients import AiohttpClient
from anonymizer.config import config, log
from anonymizer.execution.exceptions import JobError
from anonymizer.models import flaskdp


@dataclass
class DPConfiguration:
    epsilon: float
    delta: float
    sensitivity: float
    upper: float
    lower: float


class FlaskDPClient(AiohttpClient):
    ENDPOINT_APPLY = '/api/dp/apply'

    def __init__(self, url: str):
        super().__init__(config.services.flaskdp.connection)
        self.url = url

    def get_version(self) -> str:
        """Return the current FlaskDP version."""
        return flaskdp.VERSION

    async def apply_dp(self,
                       request: flaskdp.FlaskDPRequest,
                       ) -> flaskdp.FlaskDPResponse | None:
        """Apply DP to the items inside the specified FlaskDP request.

        :return: A FlaskDP response object if successful, `None`
        otherwise.

        :rtype: FlaskDPResponse or None
        """
        url = urljoin(self.url, self.ENDPOINT_APPLY)
        body = request.model_dump_json(by_alias=True)
        body = loads(body)
        log.debug('Using FlaskDP URL %s', url)

        async def _function() -> flaskdp.FlaskDPResponse | None:
            async with (self.client.post(url, json=body)
                        as response):
                if response.status != 200:
                    log.error('FlaskDP request returned HTTP status %s',
                              response.status)
                    log.debug('Request body: %s', body)
                    return None
                resp = await response.json()
                return flaskdp.FlaskDPResponse.model_validate(resp)

        def _otherwise(e: list[Exception]):
            msg = 'FlaskDP request failed'
            raise JobError(msg) from e[-1]

        return await self.retry(
            function=_function,
            until=(ClientError),
            otherwise=_otherwise,
        )
