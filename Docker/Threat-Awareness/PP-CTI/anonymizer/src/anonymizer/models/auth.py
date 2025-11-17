# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations

from functools import wraps
from inspect import isawaitable
from types import MappingProxyType
from typing import TYPE_CHECKING

from sanic.response import HTTPResponse, empty

from anonymizer.config import config

if TYPE_CHECKING:
    from sanic.request import Request


class AuthenticationResponse:
    _HEADER_MAP = MappingProxyType({
        'access_token': 'Access-Token',
        'refresh_token': 'Refresh-Token',
    })

    @classmethod
    def fail(cls) -> AuthenticationResponse:
        return AuthenticationResponse()

    @classmethod
    def success(cls, data: dict | None = None) -> AuthenticationResponse:
        return AuthenticationResponse(True, data if data is not None else {})

    def __init__(self, _bool: bool = False, _dict: dict | None = None) -> None:
        self._bool = _bool
        self._dict = _dict if _dict is not None else {}

    def authorized(self) -> bool:
        return self._bool

    def headers(self) -> dict[str, str]:
        headers = {}
        if len(self._dict) > 0:
            # Set token headers
            for k, _ in self._HEADER_MAP.items():
                if k in self._dict:
                    headers[self._HEADER_MAP[k]] = self._dict[k]
        return headers


def credentials(request: Request) -> dict:
    """Extract credentials from request headers."""
    headers = {h.lower(): v for h, v in request.headers.items()}

    h_authorization = 'authorization'
    h_username = 'username'
    h_password = 'password'  # noqa S105

    # 1: Keycloak authentication
    # 1.1: Via Direct Grant authorization
    # 1.1.1: Login
    if all(h in headers for h in [h_username, h_password]):
        return {
            'username': headers[h_username],
            'password': headers[h_password],
        }
    # 1.2: Via JWT
    if all(h in headers for h in [h_authorization]):
        return {
            'jwt': headers[h_authorization],
        }
    # Default: No authentication
    return {}


def protected(func):  # noqa: ANN201, ANN001
    def decorator(_f):  # noqa: ANN202
        @wraps(_f)
        async def decorated_function(request, *args, **kwargs) -> HTTPResponse:  # noqa: ANN001
            auth = await request.app.ctx.auth.authorize(credentials(request))
            if not auth.authorized():
                return empty(403)
            response = _f(request, *args, **kwargs)
            if isawaitable(response):
                response = await response
            response.headers.update(auth.headers())
            return response
        return decorated_function
    return decorator(func)
