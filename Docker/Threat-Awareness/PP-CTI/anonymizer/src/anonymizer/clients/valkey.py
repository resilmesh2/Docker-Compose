# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from collections.abc import Callable
from datetime import datetime
from typing import override

from msgpack import packb, unpackb
from valkey import asyncio as valkey
from valkey.backoff import ConstantBackoff
from valkey.asyncio.retry import Retry

from anonymizer.clients import Client
from anonymizer.config import config, log


class ValkeyClient(Client[valkey.Valkey]):
    KEY_AUDITS = 'AUDITS'

    def __init__(self) -> None:
        super().__init__(config.valkey.connection)

    @override
    async def _start(self) -> valkey.Valkey:
        # Valkey includes retry helpers which can replace our own.
        retry = Retry(
            ConstantBackoff(self.connection_settings.timeout),
            retries=self.connection_settings.attempts,
        )

        # Valkey will never fail client initialization.

        port = config.valkey.dsn.port
        path = config.valkey.dsn.path

        return valkey.Valkey(
            host=config.valkey.dsn.host,
            port=port if port is not None else 6379,
            db=path.strip('/') if path is not None else 0,
            protocol=3,
            ssl=config.valkey.ssl,
            retry=retry,
            retry_on_error=[ConnectionError, TimeoutError],
        )

    @override
    async def _stop(self, client: valkey.Valkey):
        await client.aclose()

    def _str_key(self, key: str) -> str:
        return f'str-{key}'

    def _dict_key(self, key: str) -> str:
        return f'dict-{key}'

    def _map_key(self, key: str) -> str:
        return f'map-{key}'

    async def _set_str(self, key: str, value: str) -> bool:
        return await self.client.set(self._str_key(key), value)

    async def _get_str(self, key: str) -> str | None:
        v: bytes | None = await self.client.get(self._str_key(key))
        if v is not None and not isinstance(v, bytes):
            msg = f'Not bytes: {type(v)}'
            raise ValueError(msg)
        return v.decode('UTF8') if v is not None else None

    async def _del_str(self, *keys: str) -> int:
        return await self.client.delete(*(self._str_key(k) for k in keys))

    async def _set_dict(self, key: str, value: dict) -> bool:
        pack = packb(value)
        return await self.client.set(self._dict_key(key), pack)

    async def _get_dict(self, key: str) -> dict | None:
        pack = await self.client.get(self._dict_key(key))
        if pack is not None:
            pack = unpackb(pack)
        return pack

    async def _del_dict(self, *keys: str) -> int:
        return await self.client.delete(*(self._dict_key(k) for k in keys))

    async def log_audit(self,
                        audit: dict,
                        timestamp: float | None = None) -> float:
        """Store an audit sorted by timestamp."""
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        pack = packb(audit)
        await self.client.zadd(self.KEY_AUDITS, {pack: timestamp})
        return timestamp

    async def remove_audit(self, timestamp: float) -> dict | None:
        """Remove the audit logged at the specified timestamp."""
        audit = await self.client.zrangebyscore(self.KEY_AUDITS,
                                                timestamp,
                                                timestamp)
        if len(audit) != 1:
            return None
        await self.client.zrem(self.KEY_AUDITS, audit[0])
        return unpackb(audit[0])

    async def update_audit(self,
                           timestamp: float,
                           update: Callable[[dict], dict]) -> bool:
        """Update an audit based on a function."""
        audit = await self.remove_audit(timestamp)
        if audit is None:
            return False
        updated_audit = update(audit)
        await self.log_audit(updated_audit, timestamp)
        return True

    async def get_audits(self,
                         *,
                         _from: datetime | None = None,
                         _until: datetime) -> list[dict]:
        """Retrieve audits from a given time range."""
        if _from is None:
            _from = datetime.now()
        ft = _from.timestamp()
        ut = _until.timestamp()

        audits = await self.client.zrangebyscore(self.KEY_AUDITS, ft, ut)
        return [unpackb(p) for p in audits]
