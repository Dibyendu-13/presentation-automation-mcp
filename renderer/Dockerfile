FROM node:20-alpine AS build
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY renderer/package.json renderer/package.json
RUN npm install --workspace renderer
COPY renderer renderer
RUN npm run build --workspace renderer

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/renderer/dist renderer/dist
RUN mkdir -p renderer/output
EXPOSE 3001
CMD ["node", "renderer/dist/server.js"]

