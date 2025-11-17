# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from json import load
from pathlib import Path
from types import SimpleNamespace

from sanic import Request as WebRequest
from sanic.response import HTTPResponse, empty

from anonymizer.config import log
from anonymizer.execution.jobs import RequestPong
from anonymizer.execution.pipeline import Pipeline, parse
from anonymizer.execution.stages import Stage
from anonymizer.models.data_model import Request
from anonymizer.transformers import RequestBody


def default_pipeline() -> Pipeline:
    env = SimpleNamespace()
    default_job = RequestPong('default-pong', env)
    default_job.init_policies({})
    default_stage = Stage('default-stage', env, default_job)
    default_stage.init_policies({})
    default_pipeline_object = Pipeline(env, default_stage)
    default_pipeline_object.init_policies({})
    return default_pipeline_object


class ExecutionEngine:
    def __init__(self, pipeline_file: Path | None):
        if pipeline_file is not None:
            log.info('Loading pipeline from file "%s"',
                     pipeline_file.as_posix())
            try:
                with pipeline_file.open() as f:
                    self.pipeline = parse(load(f))
                    return
            except FileNotFoundError:
                log.error('Unable to load pipeline from file "%s": '
                          'File not found',
                          pipeline_file)
        else:
            log.info('Unable to load pipeline: No pipeline file supplied')
        log.info('Loading default pipeline')
        self.pipeline = default_pipeline()
        return

    def get_response_code(self) -> int:
        if isinstance(self.pipeline.env.response_code, int):
            return self.pipeline.env.response_code
        return 200

    def get_response(self) -> HTTPResponse:
        if isinstance(self.pipeline.env.response, HTTPResponse):
            return self.pipeline.env.response
        return empty(self.get_response_code())

    async def run(self,
                  request: WebRequest,
                  data: Request,
                  body: RequestBody,
                  audit_timestamp: float,
                  **kwargs,
                  ) -> HTTPResponse:
        env = SimpleNamespace(request=request,
                              data=data,
                              body=body,
                              audit_timestamp=audit_timestamp)
        self.pipeline.reset(env)
        env.pipeline_results = self.pipeline.result
        log.info('Execution begin')
        pipeline_result = await self.pipeline.run_wrapped(**kwargs)
        log.info('Execution finished')
        response = env.response if hasattr(env, 'response') else empty(200)
        if not pipeline_result.success:
            log.error('Pipeline was not successful')
            response.status = 400
        return response
