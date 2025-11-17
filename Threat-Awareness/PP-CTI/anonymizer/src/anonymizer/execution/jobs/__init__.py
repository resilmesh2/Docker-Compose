# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from json import loads
from traceback import format_exc
from types import SimpleNamespace
from typing import TYPE_CHECKING, override
from uuid import uuid4

from sanic.response import json

from anonymizer.config import log
from anonymizer.execution import ReadsFromPolicies, Result
from anonymizer.execution.exceptions import JobError
from anonymizer.models import data_model
from anonymizer.models.base import Model
from anonymizer.util import import_from_str

if TYPE_CHECKING:
    from collections.abc import Iterable
    import sanic

    from anonymizer.transformers import RequestBody


@dataclass
class JobResult(Result):
    result: str


@dataclass
class GeneratorJobResult(JobResult):
    result: list[Job]


class Job(ReadsFromPolicies, ABC):
    def __init__(self,
                 name: str,
                 env: SimpleNamespace | None = None,
                 args: dict | None = None,
                 generator: GeneratorJob | None = None,
                 ):
        self.name = (name
                     if generator is None
                     else f'{generator.name}.{name}')
        self.args = {}
        if args is not None:
            self.args.update(args)
        self.env = env if env is not None else SimpleNamespace()
        self.ephemeral = False
        self.parent = None
        self.policies = {}
        self.generated_jobs_inherit_policies = True
        if generator is not None:
            self.ephemeral = True
            self.parent = generator
            self.env = generator.env

    @override
    def init_policies(self, policies: dict):
        self.policies = policies
        self.generated_jobs_inherit_policies = policies.get(
            'generated_jobs_inherit_policies',
            True,
        )

    def request(self) -> sanic.Request:
        return self.env.request

    def data(self) -> data_model.Request:
        return self.env.data

    def body(self) -> RequestBody:
        return self.env.body

    def parse_arg_as[T: Model](self, arg: dict | str | T, _cls: type[T]) -> T:
        if isinstance(arg, _cls):
            return arg
        if isinstance(arg, dict):
            return _cls.model_validate(arg)
        if isinstance(arg, str):
            return _cls.model_validate_json(arg)
        msg = f'Not a dict, string or Model subclass: {arg}'
        raise TypeError(msg)

    def get_from_env[T](self,
                        attribute: str,
                        attribute_type: type[T] | None = None,
                        ) -> T:
        try:
            element = getattr(self.env, attribute)
            if (attribute_type is not None
                and not isinstance(element, attribute_type)):
                log.error('Job "%s": env.%s returned invalid object',
                          self.name,
                          attribute)
                log.debug('Job "%s": Expected %s, got %s',
                          self.name,
                          attribute_type.__name__,
                          type(element))
                msg = 'Environment attribute returned invalid object'
                raise JobError(msg)
            return element
        except AttributeError as e:
            msg = f'Environment attribute not found: {attribute}'
            raise JobError(msg) from e

    def extract_attributes(self,
                           data: Iterable,
                           *attribute_type: str,
                           ) -> list[data_model.Attribute]:
        """Obtain Anonymizer Attributes from an iterable container.

        :param attribute_type: A list of types that extracted
        Attributes have to possess.
        """
        ret = []
        for component in data:
            if (isinstance(component, data_model.Attribute)
                and all(component.type_is(t) for t in attribute_type)):
                ret.append(component)
        return ret

    def extract_objects(self,
                        data: Iterable,
                        *object_type: str) -> list[data_model.Object]:
        """Obtain Anonymizer Objects from an iterable container.

        :param object_type: A list of types that extracted
        Objects have to possess.
        """
        ret = []
        for component in data:
            if (isinstance(component, data_model.Object)
                and all(component.type_is(t) for t in object_type)):
                ret.append(component)
        return ret

    def verify_parameters(self, args: dict, *params: str):
        log.debug('Job "%s": Verifying that %s parameters are present',
                  self.name,
                  len(params))
        for param in params:
            if param not in args:
                log.error('Job "%s": Missing parameter %s', self.name, param)
                msg = f'Missing parameter {param}'
                raise JobError(msg)

    async def run_wrapped(self, **kwargs) -> JobResult:
        rargs = {}
        rargs.update(self.args)
        rargs.update(kwargs)
        try:
            result = await self.run(**rargs)
            if result is None:
                result = ''
            return JobResult(success=True, result=str(result))
        except JobError as e:
            log.error('Job "%s": Caught an exception: %s',
                      self.name,
                      e.args[0])
            log.debug('Runtime arguments: %s', rargs)
            log.debug(format_exc())
            return JobResult(success=False, result='')

    def reset(self, env: SimpleNamespace | None = None):
        if env is None:
            env = SimpleNamespace()
        self.env = env

    @abstractmethod
    async def run(self, **kwargs):
        ...


class GeneratorJob(Job):
    async def run_wrapped(self, **kwargs) -> GeneratorJobResult:
        rargs = {}
        rargs.update(self.args)
        rargs.update(kwargs)
        try:
            result = await self.generate(**rargs)
            if self.generated_jobs_inherit_policies:
                for job in result:
                    job.init_policies(self.policies)
            return GeneratorJobResult(success=True, result=result)
        except JobError as e:
            log.error('Job "%s": Caught an exception: %s',
                      self.name,
                      e.args[0])
            log.debug('Runtime arguments: %s', rargs)
            log.debug(format_exc())
            return GeneratorJobResult(success=False, result=[])

    @override
    async def run(self, **_):
        return

    @abstractmethod
    async def generate(self, **kwargs) -> list[Job]:
        ...


class AnonymizingJob(Job):
    TYPE_ANONYMIZABLE = 'anonymizable'

    def anonymizable_components(self) -> list[data_model.Component]:
        """Filter the Anonymizer Request.

        Returns only those components that can be anonymized.
        """
        return self.data().types_get(self.TYPE_ANONYMIZABLE)


class JsonReply(Job):
    """Returns a JSON object."""

    _ParsableAsJson = dict | list | int | float | bool | str | None

    @abstractmethod
    def json_body(self, **kwargs) -> _ParsableAsJson:
        """Get the JSON element to reply with."""
        ...

    @override
    async def run(self, **kwargs):
        self.env.response = json(self.json_body(**kwargs), 200)


class RequestPong(JsonReply):
    @override
    def json_body(self, **_) -> JsonReply._ParsableAsJson:
        return self.request().json


class DataPong(JsonReply):
    @override
    def json_body(self, **_) -> JsonReply._ParsableAsJson:
        return data_model.Request.to_dict(self.data())


class ResultsPong(JsonReply):
    @override
    def json_body(self, **_) -> JsonReply._ParsableAsJson:
        return asdict(self.env.pipeline_results)


class ModelPong(JsonReply):
    """Returns a JSON representation of a Python object.

    Required parameters:

    - object_location
    - `str`

    The location of the object to reply with.  This object must be a
    subclass of the anonymizer.models.base.Model class.
    """

    PARAM_OBJL = 'object_location'

    @override
    def json_body(self, **kwargs) -> JsonReply._ParsableAsJson:
        self.verify_parameters(kwargs,
                               self.PARAM_OBJL)
        location = kwargs[self.PARAM_OBJL]
        objectt = self.get_from_env(location, Model)
        json_str = objectt.model_dump_json(by_alias=True)
        return loads(json_str)


class Empty(Job):
    def __init__(self):
        super().__init__(f'empty-job-{uuid4}', SimpleNamespace())

    @override
    async def run(self, **_):
        return


class DummyJob(Job):
    """A dummy job for testing purposes.

    Required parameters:

    - message: str
        A message to log when executing this job.

    Optional parameters:

    - fail: bool
        Whether the job should fail or not.  Defaults to False.

    """

    PARAM_MESG = 'message'
    PARAM_FAIL = 'fail'

    @override
    async def run(self, **kwargs):
        self.verify_parameters(kwargs, self.PARAM_MESG)
        message = kwargs.get(self.PARAM_MESG)
        fail = bool(kwargs.get(self.PARAM_FAIL))
        log.info('Job "%s": %s', self.name, message)
        if fail:
            msg = f'Dummy job {self.name} failed'
            raise JobError(msg)


class DummyGeneratorJob(GeneratorJob, DummyJob):
    """A dummy generator job for testing purposes.

    Required parameters:

    - jobs
    - `list[dict]`

    A list of jobs to generate.  Each dictionary shall contain "type",
    "args" and "policies" fields as described by the pipeline file, as
    well as a "name" field with the job's name.

    Optional parameters:

    - message
    - `str`

    A message to log when executing this job.

    - fail
    - `bool`

    Whether the job should fail or not.  Defaults to False.
    """

    PARAM_JOBS = 'jobs'

    @override
    async def generate(self, **kwargs) -> list[Job]:
        self.verify_parameters(kwargs, self.PARAM_JOBS)
        jobs = kwargs.get(self.PARAM_JOBS)
        message = kwargs.get(self.PARAM_MESG, None)
        fail = bool(kwargs.get(self.PARAM_FAIL))
        if message is not None:
            log.info('Job "%s": %s', self.name, message)
        if fail:
            msg = f'Dummy job {self.name} failed'
            raise JobError(msg)
        ret = []
        for job in jobs:
            job_name = job['name']
            job_type = job['type']
            job_args = job['args']
            job_policies = job['policies']
            job_obj = job_from_string(job_type, job_name, job_args, self.env)
            job_obj.ephemeral = True
            job_obj.parent = self
            job_obj.init_policies(job_policies)
            ret.append(job_obj)
        return ret


def job_from_string(job_type: str,
                    name: str,
                    args: dict | None = None,
                    env: SimpleNamespace | None = None,
                    ) -> Job:
    if env is None:
        env = SimpleNamespace()
    job_class = import_from_str(Job, job_type, 'anonymizer.execution.jobs')
    if job_class is None:
        return Empty()
    return job_class(name, env, args)
