# ===============================
# Backend Dockerfile (Stable)
# ===============================

FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
RUN mkdir -p /app/uploads /app/logs && chown -R nodeuser:nodejs /app

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch user
USER nodeuser

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
