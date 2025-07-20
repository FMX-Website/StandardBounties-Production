# StandardBounties Docker Container
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    bash \
    curl \
    jq

# Set working directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/deployments /app/logs /app/config

# Copy package files
COPY package*.json ./
COPY hardhat.config.js ./

# Install dependencies
RUN npm install

# Copy project files
COPY contracts/ ./contracts/
COPY scripts/ ./scripts/
COPY test/ ./test/
COPY *.md ./

# Copy Docker-specific files
COPY docker/ ./docker/

# Make scripts executable
RUN chmod +x docker/*.sh
RUN chmod +x scripts/*.js

# Create non-root user for security
RUN addgroup -S bounty || true && \
    adduser -D -s /bin/bash -G bounty bounty || true

# Set permissions
RUN chown -R bounty:bounty /app

# Switch to non-root user
USER bounty

# Expose ports for potential web interfaces
EXPOSE 3000 8545

# Set entrypoint
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["menu"]