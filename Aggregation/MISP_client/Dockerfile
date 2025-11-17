FROM python:3.9 AS misp_client
LABEL authors="jorgeley@silentpush.com"

RUN apt -y update
RUN adduser app --system --home /home/app
RUN chown -R app:nogroup /home/app

USER app
WORKDIR /home/app
RUN pip install --upgrade pip
COPY . .
ENTRYPOINT pip3 install -r /home/app/requirements.txt; python3 /home/app/main.py; tail -f misp_client.log