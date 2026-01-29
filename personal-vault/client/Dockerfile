# Development Dockerfile for client
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Default command (can be overridden)
CMD ["npm", "run", "dev", "--", "--host"]
