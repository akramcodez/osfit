# Use Apify's base Node.js image
FROM apify/actor-node:20

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN npm --quiet set progress=false \
    && npm install

# Copy source code
COPY . ./

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Run the Actor
CMD npm run start:prod --silent
