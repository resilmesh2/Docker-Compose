# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from functools import wraps
from inspect import isawaitable
from traceback import format_exc
from types import NoneType
from collections.abc import Callable

from sanic import HTTPResponse, Request, empty
from sanic_ext import validate as sanic_validate
from sanic_ext.exceptions import ValidationError

from anonymizer.config import log
from anonymizer.transformers import Transformer

HEADER_TTYPE = 'Transformer-Type'
PARAM_EXCH = 'exception_handler'
PARAM_FROM_TRANSFORMER = 'from_transformer'
# The parameter name for the expected class for validation
# Since we only accept JSON objects (for now), it's just one
PARAM_JSON = 'json'


def validation_fail(reason: str) -> HTTPResponse:
    log.error('Validation failed: %s', reason)
    return empty(400)


def validate(*_args, from_transformer: bool = True, **_kwargs):  # noqa: ANN201
    """Validate a web request.

    Wraps over Sanic's validation decorator by providing exception
    handling and enabling dynamic data validation according to the
    transformer class used.

    Any additional parameters are passed to Sanic's validator
    decorator, with the exception of 'form' and 'query' as this
    validator is strictly designed to only work with JSON requests.

    :param from_transformer: If True, the request HTTP headers will be
    inspected to determine the transformer and validation classes to
    use.  If unable to determine the validation class, validation will
    be skipped entirely.  When this parameter is True, any other
    parameters specifying the validation class are ignored.

    :param exception_handler: A custom exception handling function to
    be used.
    """
    # Extract exception handler if it exists
    exception_handler = _kwargs.get(PARAM_EXCH)

    # Remove our arguments so Sanic doesn't complain.  Also remove
    # other validation class parameters that aren't the JSON body.
    to_remove = [PARAM_EXCH, PARAM_FROM_TRANSFORMER, 'form', 'query']
    _kwargs = {key: value
               for key, value in _kwargs.items()
               if key not in to_remove}

    def decorator(f: Callable):  # noqa: ANN202
        @wraps(f)
        async def decorated_function(request: Request, *args, **kwargs):  # noqa: ANN202
            validation_class = NoneType
            transformer = None

            # Utility function
            async def execute_not_wrapped(body: dict | None):  # noqa: ANN202
                # Execute the (not) wrapped function like normal
                response = f(request, body, *args, **kwargs)
                if isawaitable(response):
                    response = await response
                return response

            log.info('Validating request')
            if not from_transformer:
                # If PARAM_FROM_TRANSFORMER is false, use the supplied
                # class type for validation and the empty transformer
                # for an empty Request value
                log.debug('Validating according to supplied parameters')
                if PARAM_JSON not in _kwargs:
                    # If no validation class is specified for some
                    # reason, skip the validation process (we can't
                    # infer anything)
                    return validation_fail('No validation class parameters '
                                           'supplied')
                validation_class = kwargs[PARAM_JSON]
            else:
                # If PARAM_FROM_TRANSFORMER is true, we will validate
                # according to what the transformer requires
                log.debug('Validation requires transformer from HTTP header')
                if HEADER_TTYPE not in request.headers:
                    return validation_fail('Unable to locate '
                                           f'"{HEADER_TTYPE}" HTTP header')
                transformer_type = request.headers[HEADER_TTYPE]
                log.debug('HTTP header solicits transformer "%s"',
                          transformer_type)
                try:
                    transformer = Transformer.from_string(transformer_type)
                except (ImportError, ModuleNotFoundError):
                    return validation_fail('Unable to import transformer')
                validation_class: type = transformer.get_body_type()

            # Final results
            tname = transformer.__class__.__qualname__
            vname = validation_class.__name__
            log.info('Transformer: %s', tname)
            log.info('Expected class to validate: %s', vname)

            # Set the transformer inside the request context
            request.ctx.transformer = transformer

            # If the validation class is None, perform no validation
            if validation_class is NoneType:
                log.info('No validation performed because validation class '
                         'is NoneType')
                return await execute_not_wrapped(None)

            # If the validation class is dict, ensure request body is
            # a JSON object
            if validation_class is dict:
                if not isinstance(request.json, dict):
                    return validation_fail('Request body is not a JSON object')
                return await execute_not_wrapped(request.json)

            # If the validation class is list, ensure request body is
            # a JSON list
            if validation_class is list:
                if not isinstance(request.json, list):
                    return validation_fail('Request body is not a JSON list')
                return await execute_not_wrapped(request.json)

            # Otherwise, validate using Sanic.
            # Insert the validation class into kwargs, overwrite any
            # preexisting values
            _kwargs[PARAM_JSON] = validation_class

            log.debug('Sanic decorator args: %s', _args)
            log.debug('Sanic decorator kwargs: %s', _kwargs)

            # Get the decorator from the decorator factory
            sanic_decorator = sanic_validate(*_args, **_kwargs)

            # Wrap the function we're wrapping with the decorator
            validator = sanic_decorator(f)

            try:
                # Execute the wrapped function like normal
                response = validator(request, *args, **kwargs)
                if isawaitable(response):
                    response = await response
                return response
            except Exception as e:
                if exception_handler is not None:
                    return exception_handler(e)
                if isinstance(e, ValidationError):
                    log.error('Request body does not conform to validation '
                              'class')
                    log.error('Unable to validate request')
                    log.debug(format_exc())
                    return empty(400)
                raise e
        return decorated_function
    return decorator
