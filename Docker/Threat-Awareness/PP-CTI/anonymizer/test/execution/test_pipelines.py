from sanic_testing.reusable import ReusableClient

from test import log_results


def test_successful_pipeline(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage.  The stage should execute
    like normal.  The resulting response should be `200`.
    """
    cfg_override = {
        'pipeline.file':
        'test/resources/pipelines/simple_pipeline_success.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response is not None
    log_results(response.json)
    assert response.status_code == 200


def test_failing_pipeline(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage.  The stage should fail.  The
    resulting response should be `400`.
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/simple_pipeline_fail.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert response.status_code == 400


def test_policy_optional(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one job.  The stage
    should fail.  The stage should be optional.  The resulting
    response should be `200`.
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/optional_stage.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert response.status_code == 200
