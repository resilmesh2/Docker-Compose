from json import load
from pathlib import Path
from sanic_testing.reusable import ReusableClient

from anonymizer.clients.auth import OpenIDConnectClient
from anonymizer.config import AuthProvider, KeycloakFlow
from test import log_results


def test_anonymizer_flow_misp(
        f_sanic: ReusableClient,
        f_misp_transformer_headers: dict[str, str],
        f_keycloak_auth_headers: dict[str, str],
):
    """
    In this scenario, the legacy Anonymizer flow is tested
    (receive MISP event, apply privacy policy, publish to MISP).
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/default_pipeline.json',
        'auth.provider': AuthProvider.KEYCLOAK.value,
        'auth.keycloak': {
            'flow': KeycloakFlow.DIRECT_GRANT.value,
            'url': 'http://localhost:20005/realms/test-realm',
            'client_id': 'test-client',
        },
        'services.arxlet.url': 'http://localhost:20001/v0.2',
        'services.flaskdp.url': 'http://localhost:20002',
        'services.misp': {
            'url': 'http://localhost:80',
            'key': 'yxEsr99SWzmxXXfuedtZqSioy37h8ir6TG2e48Eg',
            'ssl': False,
        },
    }

    headers = {}
    headers.update(f_misp_transformer_headers)
    headers.update(f_keycloak_auth_headers)

    f_sanic.put('/api/debug/config', json=cfg_override)
    f_sanic.app.ctx.auth = OpenIDConnectClient(
        cfg_override['auth.keycloak']['url'],
        'http://localhost',
    )

    with Path.open('test/resources/default_misp_request.json',
              encoding='UTF8') as f:
        _, response = f_sanic.post('/api/anonymizer',
                                   headers=headers,
                                   json=load(f))
        assert response is not None
        log_results(response.json)
        assert response.status_code == 200
