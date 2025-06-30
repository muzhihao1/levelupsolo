FROM node:18-alpine

# Set production environment
ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with timeout and retry
RUN npm install --production=false --legacy-peer-deps --fetch-timeout=600000 --fetch-retries=5

# Copy all source files
COPY . .

# Build the application
RUN npm run build:railway

# Expose the port
EXPOSE ${PORT:-3000}

# Start the application
CMD ["npm", "start"]