from sanic_testing.reusable import ReusableClient

from anonymizer.clients.auth import OpenIDConnectClient
from anonymizer.config import AuthProvider, KeycloakFlow


def test_keycloak_authentication_works(
        f_sanic: ReusableClient,
        f_keycloak_auth_headers: dict[str, str],
):
    """
    In this scenario, the pipeline won't fail.  The request must be
    authenticated using Keycloak.  The resulting response should be
    `200`.
    """
    cfg_override = {
        'pipeline.file': 'test/pipelines/simple_pipeline/success',
        'auth.provider': AuthProvider.KEYCLOAK.value,
        'auth.keycloak': {
            'flow': KeycloakFlow.DIRECT_GRANT.value,
            'url': 'http://localhost:20005/realms/test-realm',
            'client_id': 'test-client',
        },
    }

    f_sanic.put('/api/debug/config', json=cfg_override)
    f_sanic.app.ctx.auth = OpenIDConnectClient(
        cfg_override['auth.keycloak']['url'],
        'http://localhost',
    )

    _, response = f_sanic.get('/api/anonymizer',
                               headers=f_keycloak_auth_headers)
    assert response.status_code == 200
