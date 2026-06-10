FROM node:20-slim

# @napi-rs/canvas needs fontconfig for text rendering
RUN apt-get update && apt-get install -y \
    fontconfig \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

CMD ["node", "src/index.js"]