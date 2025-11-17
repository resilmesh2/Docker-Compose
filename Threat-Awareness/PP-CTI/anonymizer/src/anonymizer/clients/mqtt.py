# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from json import dumps
from typing import override
from uuid import uuid4
from gmqtt import Client as ClientMQTT

from anonymizer.clients import Client
from anonymizer.config import config, log


class MQTTClient(Client[ClientMQTT]):
    def __init__(self,
                 host: str | None = None,
                 port: int | None = None,
                 username: str | None = None,
                 password: str | None = None,
                 ssl: bool | None = None,
                 topic: str | None = None,
                 client_id: str | None = None,
                 ) -> None:
        super().__init__(config.services.mqtt.connection)
        if host is not None:
            self.host = host
        else:
            self.host = config.services.mqtt.host

        if port is not None:
            self.port = port
        else:
            self.port = config.services.mqtt.port

        if username is not None:
            self.username = username
        else:
            self.username = config.services.mqtt.username

        if password is not None:
            self.password = password
        else:
            self.password = config.services.mqtt.password

        if ssl is not None:
            self.ssl = ssl
        else:
            self.ssl = config.services.mqtt.ssl

        if topic is not None:
            self.topic = topic
        else:
            self.topic = config.services.mqtt.topic

        if client_id is not None:
            self.client_id = client_id
        else:
            self.client_id = config.services.mqtt.client_id

        if self.client_id is None:
            self.client_id = f'Anonymizer-{uuid4()}'

    @override
    async def _start(self) -> ClientMQTT:
        c = ClientMQTT(self.client_id)

        log.debug('Connecting to host %s, port %s', self.host, self.port)

        if self.username is not None:
            log.debug('Connecting as user "%s"', self.username)
            c.set_auth_credentials(self.username, self.password)

        await c.connect(self.host, self.port, self.ssl)
        return c

    @override
    async def _stop(self, client: ClientMQTT):
        await client.disconnect()

    def publish(self, topic: str, message: dict | list):
        """Publish an MQTT message."""
        self.client.publish(topic, dumps(message))
