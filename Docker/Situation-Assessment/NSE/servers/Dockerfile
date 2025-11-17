FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create data directory for cache
RUN mkdir -p data

EXPOSE 3002

CMD ["node", "server.js"]