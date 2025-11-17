FROM tomcat:11.0.0-jdk21
LABEL maintainer="ekam.purin@um.es"

ARG war_name

# Base URL: http://(hostname):8080/api
ADD $war_name.war /usr/local/tomcat/webapps/api.war

EXPOSE 8080
EXPOSE 8000

CMD ["catalina.sh", "run"]
