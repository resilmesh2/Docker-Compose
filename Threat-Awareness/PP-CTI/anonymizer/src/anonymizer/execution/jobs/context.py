# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from typing import override
from anonymizer.execution.jobs import Job


class StoreRequest(Job):
    """Store the current Request into the context database."""

    @override
    async def run(self, **_):
        context_client = self.request().app.ctx.context_client
        request = self.data()
        await context_client.record(request)
