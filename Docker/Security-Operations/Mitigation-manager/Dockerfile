FROM clojure:temurin-25-lein AS builder

WORKDIR /usr

COPY project.clj .
RUN lein deps

COPY src src
RUN lein uberjar

FROM eclipse-temurin:25-jdk
LABEL org.opencontainers.image.authors="Ekam Puri Nieto <ekam.purin@um.es>"

WORKDIR /usr

COPY --from=builder /usr/target/uberjar/*-standalone.jar app.jar

COPY config.edn .
COPY data data

ENTRYPOINT [ "java", "-jar", "app.jar" ]
