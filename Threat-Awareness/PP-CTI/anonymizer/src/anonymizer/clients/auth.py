# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from abc import ABC, abstractmethod
from typing import override

from aiohttp import ClientSession
from oic.oic import Client
from oic.utils.authn.client import CLIENT_AUTHN_METHOD
from oic.utils.jwt import JWT
from requests.exceptions import ConnectionError as RequestsConnectionError

from anonymizer.config import AuthProvider, config, log
from anonymizer.models.auth import AuthenticationResponse
from anonymizer.util import retry


class AuthClient(ABC):
    def __init__(self, url: str):
        self.url = url

    @abstractmethod
    async def authorize(self, credentials: dict) -> AuthenticationResponse:
        """Validate the supplied credentials."""


class NoAuthClient(AuthClient):
    def __init__(self):
        """Initialize an empty authentication client.

        This client will return `True` on any `authorize()` call.
        """
        super().__init__('')

    @override
    async def authorize(self, _) -> AuthenticationResponse:
        return AuthenticationResponse.success()


class OpenIDConnectClient(AuthClient):
    _REQUIRED_FIELDS_TOKEN = ('access_token',
                              'refresh_token',
                              'token_type',
                              'scope',
                              'expires_in')

    _CREDENTIALS_DIRECT_GRANT = ('username',
                                 'password')

    def __init__(self, url: str, redirect: str):
        """Initialize the OpenID Connect client.

        :param url: The URL of the OpenID Connect authorization
        server.

        :param redirect: The redirect URL.
        """
        super().__init__(url)
        self.redirect = redirect
        self.client = Client(client_authn_method=CLIENT_AUTHN_METHOD)
        self.config = {}  # Use to store authentication info such as endpoints
        self.config.update(**self.client.provider_config(self.url))

    async def _authorize_direct_grant(self,
                                      username: str,
                                      password: str,
                                      ) -> AuthenticationResponse:
        # The Resource Owner Password Credentials grant is not
        # available in OpenID Connect.  Thus, it is also not available
        # as a convenience method in the pyoidc.  Thus, we send a
        # simple request using aiohttp
        log.debug('Sending direct grant authorization request')
        client_id = config.auth.keycloak.client_id
        client_secret = config.auth.keycloak.client_secret
        params = {
                'client_id': client_id,
                'username': username,
                'password': password,
                'grant_type': 'password',
            }
        if client_secret is not None:
            params['client_secret'] = client_secret.get_secret_value()
        async with ClientSession() as session:
            endpoint = self.config['token_endpoint']
            async with session.post(endpoint, data=params) as resp:
                data = await resp.json()
                return (AuthenticationResponse.fail()
                        if not all(k in data
                                   for k in self._REQUIRED_FIELDS_TOKEN)
                        else AuthenticationResponse.success(data))

    async def _authorize_jwt(self, token: str) -> AuthenticationResponse:
        jwt = JWT(keyjar=self.client.keyjar, iss=self.client.issuer)
        try:
            claims = jwt.unpack(token)
            log.debug('Claims: %s', claims)
            return AuthenticationResponse.success()
        except Exception as e:
            log.error('Exception while unpacking JWT')
            log.debug('%s', str(e))
            return AuthenticationResponse.fail()

    async def register(self) -> str:
        """Register at an OpenID Connect authorization server."""
        log.debug('Sending registration request')
        endpoint = self.config['registration_endpoint']
        response = self.client.register(endpoint, redirect_uris=self.redirect)
        log.debug('Our client ID is: %s', response['client_id'])
        return response['client_id']

    @override
    async def authorize(self, credentials: dict) -> AuthenticationResponse:
        log.debug('Checking for direct grant authorization')
        if all(k in credentials
               for k in self._CREDENTIALS_DIRECT_GRANT):
            params = {k: credentials[k]
                      for k in self._CREDENTIALS_DIRECT_GRANT}
            return await self._authorize_direct_grant(**params)
        log.debug('Checking for JWT authorization')
        if 'jwt' in credentials:
            auth: str = credentials['jwt']
            return await self._authorize_jwt(auth.removeprefix('Bearer '))
        # Add other authentication flows here
        return AuthenticationResponse.fail()


async def create_keycloak_client() -> AuthClient:
    """Initialize a Keycloak auth client.

    This method will either return a working `AuthClient`, or raise
    `ValueError`.
    """
    async def _inner() -> AuthClient:  # noqa: RUF029
        return OpenIDConnectClient(url, 'http://localhost')

    async def on_failure():  # noqa: RUF029
        msg = 'Max retries exceeded when connecting to the Keycloak provider'
        raise ValueError(msg)
    url = config.auth.keycloak.url.unicode_string()
    attempts = config.auth.attempts_for(AuthProvider.KEYCLOAK)
    timeout = config.auth.timeout_for(AuthProvider.KEYCLOAK)
    log.debug('Attempting to create Keycloak client')
    log.debug('Attempts: %s, timeout: %s', attempts, timeout)
    return await retry(_inner,
                       until=(RequestsConnectionError),
                       attempts=attempts,
                       timeout=timeout,
                       on_failure=on_failure)
