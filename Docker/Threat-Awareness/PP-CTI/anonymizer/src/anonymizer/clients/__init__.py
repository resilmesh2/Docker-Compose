# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations
from abc import ABC, abstractmethod
import asyncio
from typing import TYPE_CHECKING, Self, override

from aiohttp import ClientSession

if TYPE_CHECKING:
    from anonymizer.config import ConnectionSettings
    from collections.abc import Awaitable, Callable


class ClientError(Exception):
    """Raised when a client fails."""


class ClientInitializationError(ClientError):
    """Raised when a client fails to initialize."""


class ClientNotInitializedError(ClientError):
    """Raised when trying to interact with an uninitialized client."""


class ClientRequestError(ClientError):
    """Raised when a client fails a request."""


class Client[C](ABC):
    """Base class for any external service client.

    Client classes are parametrized based on the object used for
    communicating with the service.  This object will be accessible
    through the `client` property.

    The `Client` class includes a `retry()` method, which should be
    used when interacting with the service in order to provide
    resiliency against service downtime.
    """

    def __init__(self, connection_settings: ConnectionSettings) -> None:
        self.connection_settings = connection_settings
        self._client = None

    async def __aenter__(self) -> Self:
        """Initialize the client."""
        self._client = await self._start()
        if self._client is None:
            msg = 'Undocumented issue while initializing client'
            raise ClientInitializationError(msg)
        return self

    async def __aexit__(self, exc_type, exc, tb):  # noqa: ANN001
        """Shutdown the client."""
        if self._client is not None:
            await self._stop(self._client)
            self._client = None

    @abstractmethod
    async def _start(self) -> C:
        """Initialize and return the client object.

        This function should throw `ClientInitializationError` on
        failure.
        """
        ...

    @abstractmethod
    async def _stop(self, client: C):
        """Shutdown the client.

        This function can be empty if needed.
        """
        ...

    @property
    def client(self) -> C:
        """The client object.

        This property should only be accessed after the client has
        been initialized - otherwise, it will raise
        `ClientNotInitializedError`.
        """
        if self._client is None:
            raise ClientNotInitializedError
        return self._client

    @property
    def initialized(self) -> bool:
        """Whether the client has been initialized or not."""
        return self.client is not None

    async def retry[T](
        self,
        function: Callable[[], T | Awaitable[T]],
        *,
        until: tuple[type[Exception], ...],
        otherwise: Callable[[], T | Awaitable[T]],
        on_attempt_before: Callable[[int]] | None = None,
        on_attempt_after: Callable[[int]] | None = None,
        on_timeout: Callable[[int]] | None = None,
    ) -> T:
        """Retry a callable with specific edge case behavior.

        :param function: A function to retry.  The function can be
        async, and should take no arguments.

        :param until: The exception types to catch that indicate
        failure.

        :otherwise: A function to run if the maximum amount of
        failures is reached.  The function can be async, and should
        take a list of exceptions as its argument.

        :on_attempt_before: Optional function to run before each
        attempt.  The function can be async, and should take no
        arguments.

        :on_attempt_after: Optional function to run after each
        attempt.  The function can be async, and should take no
        arguments.

        :on_timeout: Optional function to run after each timeout.  The
        function can be async, and should take no arguments.
        """
        attempt = 0
        exc = []
        while attempt < self.connection_settings.attempts:
            try:
                if on_attempt_before is not None:
                    tmp = on_attempt_before(attempt)
                    if asyncio.iscoroutine(tmp):
                        await tmp
                result = function()
                if asyncio.iscoroutine(result):
                    result = await result
                if on_attempt_after is not None:
                    tmp = on_attempt_after(attempt)
                    if asyncio.iscoroutine(tmp):
                        await tmp
                return result
            except until as e:
                exc.append(e)
                if on_timeout is not None:
                    tmp = on_timeout(attempt)
                    if asyncio.iscoroutine(tmp):
                        await tmp
                attempt = attempt + 1
                await asyncio.sleep(self.connection_settings.timeout)
                continue
        ret = otherwise(exc)
        if asyncio.iscoroutine(ret):
            ret = await ret
        return ret


class AiohttpClient(Client[ClientSession]):
    @override
    async def _start(self) -> ClientSession:
        return ClientSession()

    @override
    async def _stop(self, client: ClientSession):
        await client.close()
