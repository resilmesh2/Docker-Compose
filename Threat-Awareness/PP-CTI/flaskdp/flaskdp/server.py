# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU).
#
# See LICENSE file in the project root for details.

from sanic import Sanic

from flaskdp import bg_api

def flaskdp():
    app = Sanic('FlaskDP')
    app.blueprint(bg_api)
    return app
