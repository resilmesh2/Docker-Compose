# Copyright (C) 2025 Ekam Puri Nieto (UMU), Antonio Skarmeta Gomez
# (UMU), Jorge Bernal Bernabe (UMU).
#
# See LICENSE file in the project root for details.

from sanic.blueprints import Blueprint

from flaskdp.dp import bp_dp

bg_api = Blueprint.group(bp_dp, url_prefix='/api')
