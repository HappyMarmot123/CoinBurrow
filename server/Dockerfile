# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci --workspace server --include-workspace-root=false

FROM dependencies AS development
ENV NODE_ENV=development
ENV PORT=4000

COPY server ./server

EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace", "server"]

FROM dependencies AS build
COPY server ./server
RUN npm run build --workspace server

FROM node:22-alpine AS production-dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci --omit=dev --workspace server --include-workspace-root=false

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app

COPY --chown=node:node package.json ./package.json
COPY --chown=node:node server/package.json ./server/package.json
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/server/dist/src ./server/dist

USER node
EXPOSE 4000
CMD ["node", "server/dist/server.js"]
