# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from aiohttp import ClientSession

from anonymizer.config import log
from anonymizer.models.tmb import EventSummary


class TMBError(ConnectionError):
    """Raised when there's an error interacting with the TMB."""


class DLTSubscribeError(TMBError):
    """Raised when unable to subscribe to the TMB."""


class DLTPublishError(TMBError):
    """Raised when unable to publish an event summary to the TMB."""


class TMBClient:
    ENDPOINT_SUBSCRIBE = '/grpc/CTISUBSCRIBE'
    ENDPOINT_EVENT_SUMMARY = '/grpc/ADDEVENTSUMMARY'

    def __init__(self, url: str) -> None:
        self.url = url
        self.session = ClientSession(url)
        self.subscribed = False

    async def subscribe(self):
        """Subscribe to the DLT."""
        body = {
            'action': 'SUBSCRIBE',
            'clientID': '1111',
        }
        async with (self.session.post(self.ENDPOINT_SUBSCRIBE, json=body)
                    as response):
            # This 201 branch might no longer be necessary
            if response.status == 201:
                log.debug('Client was already subscribed')
                self.subscribed = True
                return
            if response.status != 200:
                log.debug('Received HTTP status code %s, unable to subscribe',
                          response.status)
                message = f'Expected HTTP 200, got {response.status}'
                log.debug(await response.text())
                raise DLTSubscribeError(message)
            self.subscribed = True

    async def publish_event_summary(self, summary: EventSummary):
        """Publish an event summary to the DLT."""
        if not self.subscribed:
            log.warning('Not subscribed to the DLT, subscribing...')
            await self.subscribe()
        log.debug('Publishing event summary to the DLT')
        body = {
            'action': 'ADDEVENTSUMMARY',
            'clientID': '1111',
            'eventSummaryJSON': summary.model_dump_json(by_alias=True),
        }
        async with (self.session.post(self.ENDPOINT_EVENT_SUMMARY, data=body)
                    as response):
            if response.status != 200:
                log.debug('Received HTTP status code %s, unable to publish',
                          response.status)
                message = f'Expected HTTP 200, got {response.status}'
                raise DLTPublishError(message)
            response_body = await response.json()
            try:
                code = response_body['result']['error']['code']
                message = response_body['result']['error']['message']
                match code:
                    case 0:
                        return
                    case 13:
                        log.warning('Potential error response: "%s"', message)
                        return
                    case _:
                        log.debug('Unknown error code %s', code)
                        raise DLTPublishError(message)
            except KeyError as e:
                message = 'Malformed DLT response'
                raise DLTPublishError(message) from e
