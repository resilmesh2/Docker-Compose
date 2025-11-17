# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU), Juan Hernandez Acosta (UMU).
#
# See LICENSE file in the project root for details.

from sanic import Blueprint, Sanic

from anonymizer import bg_anonymizer
from anonymizer.debug import bg_debug
from anonymizer.tasks.initialization import initialize_server, shutdown_server


def anonymizer() -> Sanic:
    app = Sanic('Anonymizer')
    bp_main = Blueprint.group(bg_debug, bg_anonymizer, url_prefix='/api')
    app.blueprint(bp_main)
    app.before_server_start(initialize_server)
    app.before_server_stop(shutdown_server)
    return app
