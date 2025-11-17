# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations

from enum import StrEnum
from typing import Self, get_args, get_origin, override

from pydantic import (
    BaseModel,
    FilePath,
    HttpUrl,
    MongoDsn,
    MySQLDsn,
    RedisDsn,
    SecretStr,
    model_validator,
)
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    YamlConfigSettingsSource,
)
from sanic.log import logger

version = '1.0'

log = logger


class KeycloakFlow(StrEnum):
    DIRECT_GRANT = 'DIRECT_GRANT'


class AuthProvider(StrEnum):
    NONE = 'NONE'
    KEYCLOAK = 'KEYCLOAK'


class ContextProvider(StrEnum):
    NONE = 'NONE'
    MONGODB = 'MONGODB'
    MYSQL = 'MYSQL'


class BaseSettingsField(BaseModel):
    _ERR_NO_PROVIDER_CFG = 'Configuration for provider "{}" missing'


class ConnectionSettings(BaseSettingsField):
    timeout: int = 5
    attempts: int = 5


class KeycloakSettings(BaseSettingsField):
    flow: KeycloakFlow = KeycloakFlow.DIRECT_GRANT
    url: HttpUrl
    client_id: str
    client_secret: SecretStr | None = None
    connection: ConnectionSettings = ConnectionSettings()


class MongoDBSettings(BaseSettingsField):
    dsn: MongoDsn
    database: str
    collection: str = 'Context'


class MySQLSettings(BaseSettingsField):
    dsn: MySQLDsn
    database: str
    table: str = 'Context'


class ARXletSettings(BaseSettingsField):
    url: HttpUrl
    connection: ConnectionSettings = ConnectionSettings()


class FlaskDPSettings(BaseSettingsField):
    url: HttpUrl
    connection: ConnectionSettings = ConnectionSettings()


class MISPSettings(BaseSettingsField):
    url: HttpUrl
    key: SecretStr
    ssl: bool = True
    connection: ConnectionSettings = ConnectionSettings()


class MQTTSettings(BaseSettingsField):
    host: str
    port: int | None = 1883
    username: str | None = None
    password: str | None = None
    ssl: bool = True
    topic: str
    client_id: str | None = None
    connection: ConnectionSettings = ConnectionSettings()


class AuditSettings(BaseSettingsField):
    url: HttpUrl
    interval: int = 86400


class PipelineSettings(BaseSettingsField):
    file: FilePath | None = None


class AuthSettings(BaseSettingsField):
    provider: AuthProvider = AuthProvider.NONE
    keycloak: KeycloakSettings | None = None
    connection: ConnectionSettings = ConnectionSettings()

    @model_validator(mode='after')
    def ensure_provider_config(self) -> Self:
        """Ensure that provider-specific config is present."""
        match self.provider:
            case AuthProvider.KEYCLOAK:
                if self.keycloak is None:
                    msg = self._ERR_NO_PROVIDER_CFG.format('Keycloak')
                    raise ValueError(msg)
        return self

    def attempts_for(self, provider: AuthProvider) -> int:
        """Get the connection attempts for a given provider."""
        match provider:
            case AuthProvider.KEYCLOAK:
                if self.keycloak is not None:
                    return self.keycloak.connection.attempts
            case _:
                return self.connection.attempts
        return self.connection.attempts

    def timeout_for(self, provider: AuthProvider) -> int:
        """Get the connection timeout for a given provider."""
        match provider:
            case AuthProvider.KEYCLOAK:
                if self.keycloak is not None:
                    return self.keycloak.connection.timeout
            case _:
                return self.connection.timeout
        return self.connection.timeout


class ValkeySettings(BaseSettingsField):
    dsn: RedisDsn = RedisDsn('redis://valkey:6379/0')
    ssl: bool = True
    connection: ConnectionSettings = ConnectionSettings()


class ContextSettings(BaseSettingsField):
    provider: ContextProvider = ContextProvider.NONE
    mongodb: MongoDBSettings | None = None
    mysql: MySQLSettings | None = None

    @model_validator(mode='after')
    def ensure_provider_config(self) -> Self:
        """Ensure that provider-specific config is present."""
        match self.provider:
            case ContextProvider.MONGODB:
                if self.mongodb is None:
                    msg = self._ERR_NO_PROVIDER_CFG.format('MongoDB')
                    raise ValueError(msg)
            case ContextProvider.MYSQL:
                if self.mysql is None:
                    msg = self._ERR_NO_PROVIDER_CFG.format('MySQL')
                    raise ValueError(msg)
        return self


class ServiceSettings(BaseSettingsField):
    arxlet: ARXletSettings | None = None
    flaskdp: FlaskDPSettings | None = None
    misp: MISPSettings | None = None
    audit: AuditSettings | None = None
    mqtt: MQTTSettings | None = None


class Settings(BaseSettings):
    pipeline: PipelineSettings = PipelineSettings()
    auth: AuthSettings = AuthSettings()
    valkey: ValkeySettings = ValkeySettings()
    context: ContextSettings = ContextSettings()
    services: ServiceSettings = ServiceSettings()

    @classmethod
    @override
    def settings_customise_sources(
            cls,
            settings_cls: type[BaseSettings],
            init_settings: PydanticBaseSettingsSource,
            env_settings: PydanticBaseSettingsSource,
            dotenv_settings: PydanticBaseSettingsSource,
            file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            YamlConfigSettingsSource(settings_cls, yaml_file='config.yaml'),
        )

    def _get_config_type(self, field: type) -> type:
        ttype = get_origin(field)
        if ttype is None:
            return field
        return self._get_config_type(get_args(field)[0])

    def update(self, settings: Settings, fields: frozenset[str]):
        """Update the configuration using another `Settings` object.

        :param settings: A `Settings` object used to extract
        configuration keys/values from.

        :param fields: A `frozenset` containing the list of fields
        that have updated values.  Fields that are nested within other
        fields are written using dot notation (f.e. "A.B.C").
        """
        log.info('Updating configuration')
        count = 0
        for f in fields:
            new_category: BaseModel = settings
            old_category: BaseModel = self
            split = f.split('.')
            for i in range(len(split)):
                attribute = split[i]
                log.debug('Evaluating field/category "%s"', attribute)
                if not hasattr(new_category, attribute):
                    msg = f'Field "{attribute}" doesn\'t exist'
                    raise ValueError(msg)
                new_field = getattr(new_category, attribute)

                if (not hasattr(old_category, attribute)
                    or getattr(old_category, attribute) is None):
                    old_field = old_category.model_fields[attribute]
                    # Edge case: when dealing with unions or annotated
                    # types, we can't check subclass directly.  Most
                    # of the times this will be the relevant class +
                    # irrelevant types (NoneType, annotation
                    # information), so we will deal with it by
                    # choosing the first until we get to the real
                    # type.
                    annotation = self._get_config_type(old_field.annotation)
                    if issubclass(annotation, BaseModel):
                        if (not isinstance(new_field, dict)
                            and not isinstance(new_field, annotation)):
                            # This can mean either that the user
                            # thought the category was a key, or that
                            # the category didn't exist and the user
                            # tried to access an inner key.  In both
                            # cases it's user error, but the second
                            # one might just be unawareness.  Make
                            # sure to send a proper error message in
                            # the future if the second case is given.
                            msg = (f'Category override value for {attribute} '
                                   'is not a dict or the correct class')
                            raise ValueError(msg)

                        new_field = (new_field
                                     if isinstance(new_field, annotation)
                                     else annotation.model_validate(
                                             new_field,
                                     ))
                        log.info('Adding new configuration category "%s"', f)
                    else:
                        log.info('Adding new configuration key "%s"', f)
                    log.debug('Configuration value: "%s"', new_field)
                    setattr(old_category, attribute, new_field)
                    count = count + 1
                    break

                old_field = getattr(old_category, attribute)
                if not isinstance(new_field, BaseModel):
                    log.info('Adding new configuration key "%s"', f)
                    setattr(old_category, attribute, new_field)
                    count = count + 1
                    break
                log.debug('Descending into category "%s"',
                          '.'.join(split[:i + 1]))
                new_category = new_field
                old_category = old_field
        log.info('Configuration has been updated')
        log.info('%s configuration %s been modified',
                 count,
                 'key has' if count == 1 else 'keys have')


config = Settings()
