from sanic_testing.reusable import ReusableClient

from test import log_results


def test_no_failed_jobs_successful_stage(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one job.  The job should
    execute like normal.  The stage's "success" field should be
    `True`.
    """
    cfg_override = {
        'pipeline.file':
        'test/resources/pipelines/simple_pipeline_success.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert response.json['result']['1']['success']


def test_failed_job_failed_stage(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one job.  The job should
    fail.  The stage's "success" field should be `False`.
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/simple_pipeline_fail.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert not response.json['result']['1']['success']


def test_generated_job_in_stage_results(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one generator job.  The
    generator job should generate a single job.  The generated job
    should execute like normal.  The stage results should contain
    results for the generated job.
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/generator_job_success.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert '1-1' in response.json['result']['1']['result']


def test_failed_optional_job_successful_stage(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one job.  The job should
    fail.  The job should be optional.  The stage's "success" field
    should be `True`.
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/optional_job.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert response.json['result']['1']['success']


def test_failed_optional_generated_job_successful_stage(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one generator job.  The
    generator job should generate a single job.  The generated job
    should fail.  The generator job should be optional.  The stage's
    "success" field should be `True`.
    """
    cfg_override = {
        'pipeline.file':
        'test/resources/pipelines/optional_generated_job_fail.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert response.json['result']['1']['success']
