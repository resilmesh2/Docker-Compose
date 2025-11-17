FROM python:3.13-alpine
LABEL org.opencontainers.image.authors="Ekam Puri Nieto <ekam.purin@um.es>"

EXPOSE 8080
WORKDIR /usr


RUN apk update && \
    mkdir -p resources/pgp pipelines /jobs /transformers /pipelines /requirements /pgp_keys

COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv==0.8.3 && \
    uv sync

COPY src ./src

ENTRYPOINT [ "uv", "run", "local", "--host", "0.0.0.0"]

CMD [ "--fast" ]
