FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production=false --legacy-peer-deps

# Copy all source files
COPY . .

# Build the application
RUN npm run build:railway

# Expose the port
EXPOSE ${PORT:-3000}

# Start the application
CMD ["npm", "run", "start:railway"]