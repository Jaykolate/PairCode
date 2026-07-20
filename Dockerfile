# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm install --only=production
# Copy build artifacts and source code needed for backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/Actions.js ./Actions.js
COPY --from=builder /app/models ./models
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/middleware ./middleware

EXPOSE 10000
ENV PORT=10000
CMD ["node", "server.js"]
