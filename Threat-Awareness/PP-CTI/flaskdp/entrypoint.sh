#!/bin/sh

exec sanic --host 0.0.0.0 flaskdp.server:flaskdp $@
