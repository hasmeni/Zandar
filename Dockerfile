# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend package files
COPY app/package*.json ./
RUN npm ci

# Copy frontend source
COPY app/ .

# Build frontend
# Set API URL to empty string so requests go to the serving origin (the backend)
ENV VITE_BACKEND_API_URL=""
RUN npm run build

# Stage 2: Setup the backend
FROM node:20-alpine AS backend-runner
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ .

# Copy built frontend assets from Stage 1
# We place them in a sibling directory expected by the server
COPY --from=frontend-builder /app/frontend/dist /app/app/dist

# Expose port (default 3001 as per server.js)
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
