# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from json import loads
import aiohttp
from urllib.parse import urljoin

from anonymizer.clients import AiohttpClient
from anonymizer.config import config, log
from anonymizer.execution.exceptions import JobError
from anonymizer.models import arxlet


class ARXletClient(AiohttpClient):
    ENDPOINT_ATTRIBUTES = '/attributes'
    ENDPOINT_OBJECTS = '/objects'

    def __init__(self, url: str):
        super().__init__(config.services.arxlet.connection)
        self.url = url

    def get_version(self) -> str:
        """Return the current ARXlet version."""
        return arxlet.VERSION

    async def anonymize_attributes(self,
                                   attributes: list[arxlet.AttributeData],
                                   pets: list[arxlet.Pet],
                                   ) -> list[str] | None:
        """Apply the specified PETs to the supplied attribute list.

        :return: An anonymized list of attributes in the same order,
        if the call was successful.  Otherwise, returns None

        :rtype: List[str] | None
        """
        request = arxlet.AttributeRequest(data=attributes, pets=pets)
        url = urljoin(self.url, self.ENDPOINT_ATTRIBUTE)
        body = request.model_dump_json(by_alias=True)
        body = loads(body)

        async def _function() -> list[str] | None:
            async with (self.client.post(url, json=body)
                        as response):
                if response.status != 200:
                    return None
                return await response.json()

        def _otherwise(e: list[Exception]):
            msg = 'ARXlet request failed'
            raise JobError(msg) from e[-1]

        return await self.retry(
            function=_function,
            until=(aiohttp.ClientError),
            otherwise=_otherwise,
        )

    async def anonymize_objects(self,
                                objects: list[arxlet.ObjectData],
                                pets: list[arxlet.Pet],
                                ) -> list[list[arxlet.Attribute]] | None:
        """Apply the specified PETs to the supplied object list.

        :return: An anonymized list of objects in the same order, if
        the call was successful.  Otherwise, returns None

        :rtype: List[Object] | None

        """
        request = arxlet.ObjectRequest(data=objects, pets=pets)
        url = self.url + ARXletClient.ENDPOINT_OBJECTS
        body = request.model_dump_json(by_alias=True)
        body = loads(body)
        log.debug('Using ARXlet URL %s', url)

        async def _function() -> list[list[arxlet.Attribute]] | None:
            async with (self.client.post(url, json=body)
                        as response):
                if response.status != 200:
                    log.error('ARXlet request returned HTTP status %s',
                              response.status)
                    log.debug('Request body: %s', body)
                    return None
                response = await response.json()
                formatted_response = []
                for obj in response:
                    formatted_obj = []
                    for att in obj:
                        formatted_obj.append(arxlet.Attribute.model_validate(att))
                    formatted_response.append(formatted_obj)
                return formatted_response

        def _otherwise(e: list[Exception]):
            msg = 'ARXlet request failed'
            raise JobError(msg) from e[-1]

        return await self.retry(
            function=_function,
            until=(aiohttp.ClientError),
            otherwise=_otherwise,
        )
