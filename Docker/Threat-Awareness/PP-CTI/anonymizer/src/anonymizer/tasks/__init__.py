# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

import asyncio
from abc import ABC, abstractmethod
from traceback import format_exc
from uuid import uuid4

from sanic import Sanic
from typing import override

from anonymizer.util import log


class Task(ABC):
    def __init__(self, name: str, app: Sanic) -> None:
        self.name = name
        self.app = app

    @abstractmethod
    async def run(self, *args, **kwargs):
        """Run the task.

        This method contains the contents of the task.
        """
        ...

    @property
    def identifier(self) -> str:
        """An identifier for the task."""
        return f'{self.name}-{uuid4()}'

    async def _skeleton(self, *args, **kwargs):
        try:
            await self.run(*args, **kwargs)
        except asyncio.CancelledError as e:
            log.warning('%s: Task cancelled', self.name)
            await self.on_cancel()
            raise e

    def __call__(self, *args, **kwargs) -> dict:
        """Convert the instance into a Sanic task.

        This method is intended to be called directly inside Sanic's
        `add_task()` method, as it contains all the arguments
        necessary for it.  An example would be:

        `my_task = MyTask(...)`
        `app.add_task(**my_task(1, 2, extra=3))`
        """
        return {
            'task': self._skeleton(*args, **kwargs),
            'name': self.identifier,
        }

    @abstractmethod
    async def on_cancel(self):
        """Cleanup after being cancelled.

        This function runs once after the task has been cancelled.
        """
        ...


class PeriodicTask(Task):
    def __init__(self,
                 app: Sanic,
                 seconds: int,
                 *,
                 skip_signals: tuple[Exception, ...] = (),
                 skip_seconds: int = -1,
                 ) -> None:
        super().__init__(self.__class__.__name__, app)
        self.seconds = seconds
        self.skip_signals = skip_signals
        self.skip_seconds = skip_seconds if skip_seconds >= 0 else seconds

    @abstractmethod
    async def on_start(self):
        """Set up task.

        This function runs before anything, and only runs once per
        task.
        """
        ...

    @abstractmethod
    async def on_skip(self):
        """Cleanup after catching a skip signal.

        This function runs before waiting for the next iteration.
        """
        ...

    @override
    @property
    def identifier(self) -> str:
        return self.name

    @override
    async def _skeleton(self, *args, **kwargs):
        await self.on_start()
        log.debug('Task initialization complete')
        while True:
            try:
                await self.run(*args, **kwargs)
                await asyncio.sleep(self.seconds)
            except self.skip_signals as e:
                log.warning('%s: Caught skip signal of type %s',
                            self.name,
                            type(e))
                log.debug(format_exc())
                await self.on_skip()
                log.warning('%s: Next execution in %s seconds',
                            self.name,
                            self.skip_seconds)
                await asyncio.sleep(self.skip_seconds)
                continue
            except asyncio.CancelledError as e:
                log.warning('%s: Task cancelled', self.name)
                await self.on_cancel()
                raise e
