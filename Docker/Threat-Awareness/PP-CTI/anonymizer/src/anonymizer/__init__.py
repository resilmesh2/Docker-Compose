# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from datetime import datetime
from traceback import format_exc
from sanic import Blueprint, HTTPResponse, Sanic, empty, json
from sanic.request import Request

from anonymizer import tasks
from anonymizer.config import version, config, log
from anonymizer.execution.engine import ExecutionEngine
from anonymizer.models.auth import protected
from anonymizer.transformers import RequestBody
from anonymizer.util import import_from_str
from anonymizer.validation import validate

bp_anonymizer = Blueprint('anonymizer')
bp_tasks = Blueprint('tasks', url_prefix='/tasks')
bg_anonymizer = Blueprint.group(bp_anonymizer, bp_tasks)


def _can_create_task(app: Sanic, task: tasks.Task) -> bool:
    if (isinstance(task, tasks.PeriodicTask)
        and app.get_task(task.identifier, raise_exception=False) is not None):
        log.error('Attempted to create duplicate periodic task')
        log.debug('Task name: %s', task.name)
        return False
    return True


@bp_anonymizer.get('/version')
def version_endpoint(*_) -> HTTPResponse:
    """Return a JSON object with version information.

    openapi:
    ---
    responses:
      '200':
        description: Version information
        content:
          application/json:
            schema:
              type: object
              required:
                - version
                - major
                - minor
              properties:
                version:
                  type: string
                  description: The complete Anonymizer version string
                  examples:
                     - "v1.0"
                major:
                  type: integer
                  description: The major version
                  format: int32
                  examples:
                    - 1
                minor:
                  type: integer
                  description: The minor version
                  format: int32
                  examples:
                    - 0
    """
    return json({
        'version': f'v{version}',
        'major': int(version.split('.')[0]),
        'minor': int(version.split('.')[1]),
    })


@bp_anonymizer.get('/anonymizer')
@protected
def verify_credentials(_: Request) -> HTTPResponse:
    """Verify the supplied credentials."""
    return empty(200)


@bp_anonymizer.post('/anonymizer')
@validate()
@protected
async def anonymize(request: Request, body: RequestBody) -> HTTPResponse:
    """Execute the pipeline on the received data."""
    snapshot = request.ctx.transformer.snapshot(body)
    #timestamp = await request.app.ctx.valkey.log_audit(snapshot)
    log.debug('Pipeline file: %s', config.pipeline.file)
    engine = ExecutionEngine(config.pipeline.file)
    return await engine.run(request,
                            request.ctx.transformer.transform(body),
                            body,
                            datetime.now().timestamp())


@bp_tasks.put('/<task_name:str>')
def add_task(request: Request, task_name: str) -> HTTPResponse:
    log.info('Adding task "%s"', task_name)
    try:
        task_class = import_from_str(tasks.Task,
                                     task_name,
                                     'anonymizer.tasks')
    except (AttributeError, ImportError, ModuleNotFoundError):
        log.error('Unable to locate task "%s"', task_name)
        log.debug(format_exc())
        return empty(400)
    if task_class is None:
        log.error('Task "%s" not found')
        return empty(400)

    task = task_class(request.app)

    if not _can_create_task(request.app, task):
        log.error('Unable to create task "%s"', task_name)
        return empty(500)

    log.debug('Adding task "%s"', task_name)
    request.app.add_task(**task())
    return empty(200)


@bp_tasks.patch('/<task_name:str>')
async def reset_task(request: Request, task_name: str) -> HTTPResponse:
    log.info('Resetting task "%s"', task_name)
    task_class = import_from_str(tasks.Task,
                                 task_name,
                                 'anonymizer.tasks')
    if task_class is None:
        log.error('Task "%s" not found')
        return empty(400)

    task = task_class(request.app)

    log.debug('Removing task "%s"', task_name)
    await request.app.cancel_task(task.identifier,
                                  raise_exception=False)
    request.app.purge_tasks()

    if not _can_create_task(request.app, task):
        log.error('Unable to recreate task "%s"', task_name)
        return empty(500)

    log.debug('Readding task "%s"', task_name)
    request.app.add_task(**task())
    return empty(200)


@bp_tasks.delete('/<task_name:str>')
async def delete_task(request: Request, task_name: str) -> HTTPResponse:
    log.info('Deleting task "%s"', task_name)
    task_class = import_from_str(tasks.Task,
                                 task_name,
                                 'anonymizer.tasks')
    if task_class is None:
        log.error('Task "%s" not found')
        return empty(400)

    task = task_class(request.app)

    log.debug('Removing task "%s"', task_name)
    await request.app.cancel_task(task.identifier,
                                  'Cancelled by endpoint',
                                  raise_exception=False)
    request.app.purge_tasks()
    return empty(200)
