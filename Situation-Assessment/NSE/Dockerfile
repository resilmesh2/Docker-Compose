# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage  
FROM nginx:alpine

# Remove default nginx config and files
RUN rm -f /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*

# Copy built Angular app from browser subdirectory
COPY --from=build /app/dist/network-visualisation-dashboard/browser/ /usr/share/nginx/html/

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]