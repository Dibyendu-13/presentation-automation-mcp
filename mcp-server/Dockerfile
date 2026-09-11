FROM node:20-alpine AS build
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY mcp-server/package.json mcp-server/package.json
RUN npm install --workspace mcp-server
COPY mcp-server mcp-server
RUN npm run build --workspace mcp-server
CMD ["node", "mcp-server/dist/index.js"]

