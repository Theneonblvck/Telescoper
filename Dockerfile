# Stage 1: Build
FROM node:20-alpine as builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Dependencies
RUN npm ci

# Copy Source Code
COPY . .

# Build Frontend (Vite)
RUN npm run build

# Build Backend (Typescript)
# Compile server.ts to dist-server/server.js
RUN npx tsc server.ts --outDir dist-server --esModuleInterop --module commonjs --target es2020 --skipLibCheck
RUN echo '{"type": "commonjs"}' > dist-server/package.json

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Production Dependencies only
RUN npm ci --only=production

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Environment Variables default
ENV PORT=8080
ENV NODE_ENV=production

# User configuration (Cloud Run uses a non-root user by default or we can enforce it)
USER node

# Expose Port
EXPOSE 8080

# Start Server
CMD ["node", "dist-server/server.js"]
