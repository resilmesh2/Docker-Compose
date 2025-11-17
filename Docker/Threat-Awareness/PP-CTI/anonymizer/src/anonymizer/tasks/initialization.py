# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from sanic import Sanic

from anonymizer.clients import Client, auth, context, valkey
from anonymizer.config import AuthProvider, ContextProvider, config, log


async def initialize_server(app: Sanic):
    """Initialize essential Anonymizer services."""
    log.info('Initializing server')
    try:
        await _initialize_auth_service(app)
        await _initialize_context_service(app)
        await _initialize_valkey_service(app)
    except ValueError as e:
        log.critical('Service initialization failed, unable to continue')
        log.critical('Reason: %s', e.args[0])
        app.stop()


async def _initialize_auth_service(app: Sanic):
    log.info('Initializing auth service')
    match config.auth.provider:
        case AuthProvider.KEYCLOAK:
            log.info('Auth provider is Keycloak')
            app.ctx.auth = await auth.create_keycloak_client()
        case AuthProvider.NONE:
            log.warning('No auth provider specified')
            app.ctx.auth = auth.NoAuthClient()
        case _:
            log.critical('Unknown auth provider')
            msg = f'Unknown auth provider: "{config.auth.provider}"'
            raise ValueError(msg)


async def _initialize_context_service(app: Sanic):  # noqa: RUF029
    log.info('Initializing context service')
    match config.context.provider:
        case ContextProvider.MYSQL:
            log.info('Context provider is MySQL')
            app.ctx.context_client = context.MySQLContextClient()
        case ContextProvider.MONGODB:
            log.info('Context provider is MongoDB')
            app.ctx.context_client = context.MongoDBContextClient()
        case ContextProvider.NONE:
            log.warning('No context provider specified')
            app.ctx.context_client = context.NoContextClient()
        case _:
            log.critical('Unknown context provider')
            msg = (f'Unknown context provider: "{config.context.provider}"')
            raise ValueError(msg)


async def _initialize_valkey_service(app: Sanic):
    log.info('Initializing Valkey service')
    client = valkey.ValkeyClient()
    await client.__aenter__()
    app.ctx.valkey = client


async def shutdown_server(app: Sanic):
    """Shutdown Anonymizer services."""
    log.info('Closing service connections')
    for name, val in vars(app.ctx).items():
        if isinstance(val, Client):
            if not val.initialized:
                log.warning('Client "%s" was never initialized', name)
            else:
                await val.__aexit__(None, None, None)
