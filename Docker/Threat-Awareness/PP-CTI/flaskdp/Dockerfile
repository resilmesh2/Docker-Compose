FROM python:3.11-alpine3.19
LABEL org.opencontainers.image.authors="Ekam Puri Nieto <ekam.purin@um.es>, Juan Hernandez Acosta <juan.hernandeza@um.es>"
EXPOSE 8000

WORKDIR /usr/src/app

RUN apk update && apk upgrade

RUN apk add build-base

COPY Pipfile Pipfile.lock ./

RUN pip install --no-cache-dir micropipenv && \
    micropipenv requirements > requirements.txt && \
    pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y micropipenv && \
    rm Pipfile Pipfile.lock requirements.txt

COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

COPY flaskdp ./flaskdp

ENTRYPOINT [ "./entrypoint.sh" ]
