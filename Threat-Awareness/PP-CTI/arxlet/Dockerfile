FROM tomcat:11.0.0-jdk21
LABEL org.opencontainers.image.authors="Ekam Puri Nieto <ekam.purin@um.es>, Juan Hernandez Acosta <juan.hernandeza@um.es>"
EXPOSE 8080
EXPOSE 8000

ARG version

# Base URL: http://(hostname):8080/vX.X
ADD server/build/libs/server.war /usr/local/tomcat/webapps/api.

CMD ["catalina.sh", "run"]
