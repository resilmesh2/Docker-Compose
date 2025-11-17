# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from json import loads
from sanic import Blueprint, HTTPResponse, Request, empty, json
from sanic.response import text

from anonymizer.config import Settings, config
from anonymizer.tasks.initialization import initialize_server

bp_debug = Blueprint('debug')
bg_debug = Blueprint.group(bp_debug, url_prefix='/debug')


@bp_debug.get('/hello-world')
def test(*_) -> HTTPResponse:
    """Return "Hello World!".

    Returns a "Hello World!" string.  Useful for debugging.
    """
    return text('Hello World!')


@bp_debug.get('/config')
def get_config(*_) -> HTTPResponse:
    d = loads(config.model_dump_json(by_alias=True))
    return json(d)


@bp_debug.put('/config')
async def set_config(request: Request) -> HTTPResponse:
    dict1 = request.json
    dict2 = {}
    override_keys = set()
    for key, value in dict1.items():
        override_keys.add(key)
        split = key.split('.')
        entry = dict2
        for attribute in split[:-1]:
            if attribute not in entry:
                entry[attribute] = {}
            entry = entry[attribute]
        entry[split[-1]] = value
    new_settings = Settings.model_validate(dict2)
    config.update(new_settings, override_keys)
    await initialize_server(request.app)
    return empty(200)
