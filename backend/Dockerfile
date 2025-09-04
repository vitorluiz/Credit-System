# Use the official Node.js 22 LTS Alpine image as our base. According to
# the Node.js website the v22 line is the current LTS as of July 2025【382071656606706†L31-L34】.
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install curl for container healthchecks
RUN apk add --no-cache curl

# Copy package.json and package-lock.json first to leverage Docker
# layer caching. We don't commit a lockfile here but if one existed it
# would improve build reproducibility.
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application source
COPY . .

# Expose the port used by our Express app
EXPOSE 4000

# Launch the API server
CMD ["npm", "start"]
