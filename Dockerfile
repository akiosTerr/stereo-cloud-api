# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN yarn build

########################################################

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create necessary directories
RUN mkdir -p /app/data /app/config && \
    chown -R appuser:appgroup /app/data /app/config

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Create volumes for database and config
VOLUME ["/app/data", "/app/config"]

# Expose application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV production
ENV DB_PATH /app/data/database.sqlite

# Start the application
CMD ["yarn", "start:prod"] 