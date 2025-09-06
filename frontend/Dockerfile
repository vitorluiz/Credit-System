# Multi‑stage Dockerfile for building and serving the React front‑end.
# The build stage uses Node 22 LTS to compile the Vite project. The
# serve stage uses nginx to serve the compiled static assets. React
# version 19.1.1 is used which is the stable release from July 2025【376294506914456†L210-L219】.

# Stage 1: build the application
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: serve the compiled assets with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
