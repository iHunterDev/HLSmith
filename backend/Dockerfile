# Use Node.js 18 Alpine Linux as base
FROM node:18-alpine

# Install FFmpeg for video processing
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Create storage directories
RUN mkdir -p storage/uploads storage/hls storage/thumbnails storage/chunks storage/original

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "start"]