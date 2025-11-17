# Official base image
FROM node:18.3.0-alpine3.15

# set working directory
WORKDIR /app

# install yarn globally
#RUN npm install -g yarn

# copy package.json and package-lock.json to install dependencies
COPY package.json ./
COPY yarn.lock ./

# clear yarn cache to avoid potential corruption
RUN yarn cache clean --force

RUN yarn add react-json-view --save
# install dependencies using yarn
RUN yarn install --frozen-lockfile

# add app source code
COPY src ./

# set environment variable to bypass OpenSSL 3.0 issue
ENV NODE_OPTIONS=--openssl-legacy-provider

#es posible que no sea necesario la seccion de arg.
#comprobar una vez renueven el certificado del sso para
#el flujo completo
ARG REACT_APP_PRIVSERV_URL

#esta seccion es posible que tampoco sea necesaria
#si con las variables en tiempo de ejecuciÃ³n funciona.
#hay que comprobarlo como arriba.
ENV REACT_APP_PRIVSERV_URL=${REACT_APP_PRIVSERV_URL}

# start app
CMD ["yarn", "start"]

#en ocasiones usar la flag --trace-deprecation puede solucionar indirectamente problemas de compilacion
#en caso de ser necesario, descomentar esta línea y comentar la anterior.
#CMD ["yarn", "start", "--trace-deprecation"]

