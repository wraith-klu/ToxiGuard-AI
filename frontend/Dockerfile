# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package info and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .

# Build argument for backend API URL (Vite reads VITE_* env variables at build time)
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
