# Use Node.js 20 as the base image for better Sharp compatibility
FROM node:20-alpine

# Install system dependencies required for Sharp
RUN apk add --no-cache vips-dev build-base python3

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies (npm will handle Sharp through package.json overrides)
RUN npm install

# Copy the entire application source code
COPY . .

# Build the application
RUN npm run build

# Set environment variable for port
ENV PORT=2101

# Expose the necessary port (adjust as needed)
EXPOSE 2101

# Start the application
CMD ["npm", "run", "start"]
