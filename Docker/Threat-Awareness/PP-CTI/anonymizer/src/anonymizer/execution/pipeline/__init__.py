# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from dataclasses import dataclass
from traceback import format_exc
from types import SimpleNamespace
from typing import override

from anonymizer.config import log
from anonymizer.execution import ReadsFromPolicies, Result
from anonymizer.execution.exceptions import PipelineError
from anonymizer.execution.jobs import job_from_string
from anonymizer.execution.stages import Stage, StageResult


@dataclass
class PipelineResult(Result):
    result: dict[str, StageResult]


class Pipeline(ReadsFromPolicies):
    def __init__(self,
                 env: SimpleNamespace,
                 *stages: Stage,
                 ):
        self.stages: list[Stage] = []
        self.next: int = 0
        self.result = PipelineResult(success=True, result={})
        self.env: SimpleNamespace = env
        self.policies = {}
        self.discard_response_on_failure = True
        self.optional: list[str] = []
        for stage in stages:
            self.stages.append(stage)

    @override
    def init_policies(self, policies: dict):
        self.policies = policies
        self.discard_response_on_failure: bool = policies.get(
            'discard_response_on_failure',
            True,
        )
        self.optional: list[str] = policies.get(
            'optional',
            [],
        )

    async def run_wrapped(self, **kwargs) -> PipelineResult:
        """Execute all stages in the pipeline."""
        try:
            result = await self.all(**kwargs)
            for stage in result.result:
                if stage in self.optional:
                    continue
                stage_result = result.result[stage]
                if not stage_result.success:
                    result.success = False
                    break
            return result
        except PipelineError as e:
            log.error('Pipeline: Caught an exception: %s',
                      e.args[0])
            log.debug('Runtime arguments: %s', kwargs)
            log.debug(format_exc())
            return PipelineResult(success=False, result={})

    async def all(self, **kwargs) -> PipelineResult:
        """Execute all remaining stages in the pipeline.

        If previous stages have already been executed, resumes from
        the next stage in line.
        """
        count = 0
        one = await self.one(**kwargs)
        while one:
            if one == -1:
                count = count + 1
            one = await self.one(**kwargs)
        return self.result

    async def one(self, **kwargs) -> StageResult | None:
        """Execute the next stage.

        :return: The stage's result, or `None` if there are no more
        stages.
        """
        if self.next >= len(self.stages):
            return None
        stage = self.stages[self.next]
        self.next = self.next + 1

        log.info('Pipeline:\tBegin execution of stage "%s"', stage.name)
        stage_result = await stage.run_wrapped(**kwargs)
        log.info('Pipeline:\tFinished execution of stage "%s"', stage.name)
        self.result.result[stage.name] = stage_result
        return stage_result

    def reset(self, env: SimpleNamespace | None = None):
        self.result = PipelineResult(success=True, result={})
        self.env = env if env is not None else SimpleNamespace()
        self.next = 0
        for stage in self.stages:
            stage.reset(env)


def parse(pipeline: dict) -> Pipeline:
    env = SimpleNamespace()
    pipeline_policies = pipeline.get('policies', {})
    ret = Pipeline(env)
    ret.init_policies(pipeline_policies)
    jobs = {}
    stages = pipeline['stages']
    for stage in stages:
        match stage:
            case str():
                jobs[stage] = {'policies': {}, 'jobs': []}
            case dict():
                stage_policies = stage.get('policies', {})
                jobs[stage['name']] = {'policies': stage_policies, 'jobs': []}
            case _:
                msg = f'Unknown stage type: {type(stage)}'
                raise TypeError(msg)
    for name, job in pipeline['jobs'].items():
        args = job.get('args', None)
        job_policies = job.get('policies', {})
        job_obj = job_from_string(job['type'], name, args, env)
        job_obj.init_policies(job_policies)
        stage = job['stage']
        if stage not in jobs:
            msg = f'Missing stage: {stage}'
            raise ValueError(msg)
        jobs[stage]['jobs'].append(job_obj)
    for stage, info in jobs.items():
        stage_obj = Stage(stage, env, *info['jobs'])
        stage_obj.init_policies(info['policies'])
        ret.stages.append(stage_obj)
    return ret
