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
from anonymizer.execution.exceptions import StageError
from anonymizer.execution.jobs import GeneratorJobResult, Job, JobResult


@dataclass
class StageResult(Result):
    result: dict[str, JobResult]
    failures: int


class Stage(ReadsFromPolicies):
    def __init__(self,
                 name: str,
                 env: SimpleNamespace,
                 *jobs: Job,
                 ) -> None:
        self.name: str = name
        self.env: SimpleNamespace = env
        self.result = StageResult(success=True, result={}, failures=0)
        self.jobs: list[Job] = []
        self.next: int = 0
        self.fatal_failures = 0
        self.policies = {}
        self.optional: list[str]
        for j in jobs:
            self.jobs.append(j)

    @override
    def init_policies(self, policies: dict):
        self.policies = policies
        self.optional: list[str] = policies.get(
            'optional',
            [],
        )

    async def run_wrapped(self, **kwargs) -> StageResult:
        """Execute all jobs in the stage."""
        try:
            result = await self.all(**kwargs)
            if self.fatal_failures > 0:
                result.success = False
            return result
        except StageError as e:
            log.error('Stage "%s": Caught an exception: %s',
                      self.name,
                      e.args[0])
            log.debug('Runtime arguments: %s', kwargs)
            log.debug(format_exc())
            return StageResult(success=False, result={}, failures=-1)

    async def all(self, **kwargs) -> StageResult:
        """Execute all jobs in the stage.

        If previous jobs have already been executed, resumes from the
        next job in line
        """
        result = await self.one(**kwargs)
        while result is not None:
            result = await self.one(**kwargs)
        return self.result

    async def one(self, **kwargs) -> JobResult | None:
        """Execute the next job in the stage.

        :return: The job's result, or `None` if there are no more jobs
        """
        if self.next >= len(self.jobs):
            return None
        job = self.jobs[self.next]
        self.next = self.next + 1

        log.info('Stage "%s":\tBegin execution of job "%s"',
                 self.name,
                 job.name)
        job_result = await job.run_wrapped(**kwargs)
        log.info('Stage "%s":\tFinished execution of job "%s"',
                 self.name,
                 job.name)
        if job.ephemeral:
            log.info('Stage "%s":\tRemoving ephemeral job "%s"',
                     self.name,
                     job.name)
            self.next = self.next - 1
            self.jobs.remove(job)
        if isinstance(job_result, GeneratorJobResult):
            log.info('Stage "%s":\tJob "%s" created %s new jobs',
                     self.name,
                     job.name,
                     len(job_result.result))
            for subjob in reversed(job_result.result):
                self.jobs.insert(self.next, subjob)

            # For serialization purposes, we now replace the
            # GeneratorJobResult with a regular JobResult that has a
            # serializable result field
            names = [j.name for j in job_result.result]
            success = job_result.success
            job_result = JobResult(success=success, result=str(names))
        self.result.result[job.name] = job_result

        if not job_result.success:
            self.result.failures = self.result.failures + 1
            if not self._is_optional(job):
                self.fatal_failures = self.fatal_failures + 1
        return job_result

    def reset(self, env: SimpleNamespace | None = None) -> None:
        StageResult(success=True, result={}, failures=0)
        self.env = env if env is not None else SimpleNamespace()
        self.next = 0
        for job in self.jobs:
            job.reset(env)

    def _is_optional(self, job: Job) -> bool:
        if job.parent is not None:
            return self._is_optional(job.parent)
        return job.name in self.optional
