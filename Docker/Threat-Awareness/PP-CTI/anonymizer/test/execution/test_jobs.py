from sanic_testing.reusable import ReusableClient

from test import log_results


def test_successful_job(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one job.  The job should
    execute like normal.  The job's "success" field should be `True`.
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
    assert response.json['result']['1']['result']['1']['success']


def test_failed_job(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one job.  The job should
    raise a JobException.  The job's "success" field should be
    `False`.
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/simple_pipeline_fail.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert not response.json['result']['1']['result']['1']['success']


def test_failed_generator_job(
        f_sanic: ReusableClient,
        f_no_transformer_headers: dict[str, str],
):
    """
    In this scenario, there is one stage with one generator job.  The
    generator job should raise a JobException.  The stage should have
    not executed any generated jobs.
    """
    cfg_override = {
        'pipeline.file': 'test/resources/pipelines/generator_job_fail.json',
    }
    f_sanic.put('/api/debug/config', json=cfg_override)

    _, response = f_sanic.post('/api/anonymizer',
                               headers=f_no_transformer_headers)
    assert response.json is not None
    log_results(response.json)
    assert len(response.json['result']['1']['result']) == 1
