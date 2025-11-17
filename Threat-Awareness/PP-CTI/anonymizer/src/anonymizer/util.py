# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

import asyncio
from collections.abc import Awaitable, Callable
from importlib import import_module
from json import dumps
from pathlib import Path
from typing import Any

from anonymizer.config import config, log


async def retry(_f: Callable[[], Awaitable],
                *,
                until: tuple[type[Exception], ...],
                attempts: int,
                timeout: int,
                on_attempt_before: Callable[[int], Awaitable] | None = None,
                on_attempt_after: Callable[[int], Awaitable] | None = None,
                on_timeout: Callable[[int], Awaitable] | None = None,
                on_failure: Callable[[], Awaitable] | None = None,
                ) -> Any:  # noqa: ANN401
    """Retry a callable with specific edge case behavior.

    :param _f: A callable to retry.

    :param exception: The exception types to catch that indicate
    failure.

    :param attempts: The amount of times to retry the method.

    :param timeout: The amount of seconds to wait in between attempts.

    :on_attempt_before: Optional callable to run before each attempt.

    :on_attempt_after: Optional callable to run after each attempt.

    :on_timeout: Optional callable to run before each timeout.

    :on_failure: Optional callable to run after the maximum amount of
    failures.  If present, this callable's return value will replace
    the original response.
    """
    attempt = 0
    while attempt < attempts:
        try:
            if on_attempt_before is not None:
                await on_attempt_before(attempt)
            result = await _f()
            if on_attempt_after is not None:
                await on_attempt_after(attempt)
            return result
        except until:
            if on_timeout is not None:
                await on_timeout(attempt)
            attempt = attempt + 1
            await asyncio.sleep(timeout)
            continue
    if on_failure is not None:
        await on_failure()
    return None


def import_from_str[T](expected_type: type[T],
                       import_string: str,
                       base_module: str) -> type[T] | None:
    expected = expected_type.__name__
    log_str = f'Unable to parse {expected} "{import_string}:"'
    log.debug('Attempting to parse %s of type "%s"',
              expected,
              import_string)
    split = import_string.rsplit('.', 1)
    if len(split) != 2:
        # No module means a class specified in __init__.py
        module = base_module
        clazz = split[0]
    else:
        module = '.'.join([base_module, split[0]])
        clazz = split[1]
    try:
        thing = getattr(import_module(module), clazz)
        if not issubclass(thing, expected_type):
            log.error('Class %s is not a subclass of %s',
                      thing.__name__,
                      expected)
            return None
        return thing
    except ModuleNotFoundError as e:
        log.error('%s unable to locate module "%s"', log_str, module)
        raise e
    except ImportError as e:
        log.error('%s unable to import class "%s"', log_str, clazz)
        raise e
    except AttributeError as e:
        log.error('%s unable to import class "%s"', log_str, clazz)
        raise e


def generate_config_schema():
    """Generate a JSON schema for the Config class."""
    path = 'config-schema.json'
    with Path(path).open('w') as f:
        f.write(dumps(config.model_json_schema(), indent=4))
