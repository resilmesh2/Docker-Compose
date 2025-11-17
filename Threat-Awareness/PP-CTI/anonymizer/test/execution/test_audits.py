from json import load
from pathlib import Path

from sanic_testing.reusable import ReusableClient

from anonymizer.clients.valkey import ValkeyClient


def _run_simple_request(client: ReusableClient, headers: dict, body: dict):
    cfg_override = {
        'pipeline.file':
        'test/resources/pipelines/simple_pipeline_success.json',
    }
    client.put('/api/debug/config', json=cfg_override)

    _, response = client.post('/api/anonymizer',
                              headers=headers,
                              json=body)
    assert response.json is not None


def test_no_transformer_request_is_audited_at_least_once(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one request.  The Transformer-Type HTTP
    header is set to "NoTransformer".  The `ValkeyClient.log_audit`
    method should be called at least once.
    """
    _run_simple_request(f_sanic, f_no_transformer_headers, {})
    assert ValkeyClient.log_audit.called
    assert ValkeyClient.log_audit.call_count >= 1


def test_misp_transformer_request_is_audited_at_least_once(
        f_sanic: ReusableClient,
        f_misp_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one request.  The Transformer-Type HTTP
    header is set to "misp.MispTransformer".  The
    `ValkeyClient.log_audit` method should be called at least once.
    """
    with Path.open('test/resources/default_misp_request.json',
              encoding='UTF8') as f:
        _run_simple_request(f_sanic, f_misp_transformer_headers, load(f))
        assert ValkeyClient.log_audit.called
        assert ValkeyClient.log_audit.call_count >= 1
