FROM node:22-alpine AS builder
RUN NG_CLI_ANALYTICS=false npm install -g @angular/cli
ARG NG_ENVIRONMENT

COPY . /build/
COPY *.json /build/

RUN cd /build && \
    npm install --legacy-peer-deps && \
    ng build --configuration $NG_ENVIRONMENT


FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY --from=builder --chown=nginx:nginx /build/dist/*/browser /app
COPY etc/nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 777 /app
EXPOSE 4200
