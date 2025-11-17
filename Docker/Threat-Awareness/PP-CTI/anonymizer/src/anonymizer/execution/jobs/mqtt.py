# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from json import dumps
from types import SimpleNamespace
from typing import Any, override

from anonymizer.clients.mqtt import MQTTClient
from anonymizer.config import config, log
from anonymizer.execution.exceptions import JobError
from anonymizer.execution.jobs import GeneratorJob, Job


class MqttJob(Job):
    """Abstract class for MQTT-related jobs to inherit from.

    - mqtt_host (Optional)
    - `str`

    An alternative host to send MQTT messages to.

    - mqtt_port (Optional)
    - `str`

    An alternative port to send MQTT messages to.

    - mqtt_username (Optional)
    - `str`

    An alternative MQTT username to use.

    - mqtt_password (Optional)
    - `str`

    An alternative MQTT password to use.

    - mqtt_ssl (Optional)
    - `bool`

    Whether the connection should be done with SSl.
    """

    PARAM_HOST = 'mqtt_host'
    PARAM_PORT = 'mqtt_port'
    PARAM_USRM = 'mqtt_username'
    PARAM_PASM = 'mqtt_password'
    PARAM_SSLM = 'mqtt_ssl'

    def __init__(self, name: str,
                 env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None,
                 ):
        super().__init__(name, env, args, generator)


class Publish(MqttJob):
    """Publish a JSON object/list/primitive.

    - location
    - `str`

    The location of the JSON payload.

    - topic (Optional)
    - `str`

    An alternative topic to send the message to.

    - mqtt_host (Optional)
    - `str`

    An alternative host to send MQTT messages to.

    - mqtt_port (Optional)
    - `str`

    An alternative port to send MQTT messages to.

    - mqtt_username (Optional)
    - `str`

    An alternative MQTT username to use.

    - mqtt_password (Optional)
    - `str`

    An alternative MQTT password to use.  If there is a default
    password but no password is desired, set this to 'None'.
    """

    PARAM_LOCA = 'location'
    PARAM_TOPC = 'topic'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs, self.PARAM_LOCA)
        location = kwargs[self.PARAM_LOCA]
        topic = kwargs.get(self.PARAM_TOPC,
                           config.services.mqtt.topic)
        host = kwargs.get(self.PARAM_HOST,
                          config.services.mqtt.host)
        port = kwargs.get(self.PARAM_PORT,
                          config.services.mqtt.port)
        username = kwargs.get(self.PARAM_USRM,
                              config.services.mqtt.username)
        password = kwargs.get(self.PARAM_USRM,
                              config.services.mqtt.password)
        if password is 'None':  # noqa: S105
            password = None
        ssl = bool(kwargs.get(self.PARAM_SSLM,
                              config.services.mqtt.ssl))

        log.info('Job %s: Retrieving MQTT payload at "%s"',
                 self.name,
                 location)

        payload = self.get_from_env(location)

        try:
            dumps(payload)
        except (TypeError, OverflowError) as e:
            msg = 'Unserializable MQTT payload'
            raise JobError(msg) from e

        log.info('Job %s: Publishing MQTT message', self.name)

        async with (MQTTClient(host, port, username, password, ssl, topic)
                    as client):
            client.publish(topic, payload)
