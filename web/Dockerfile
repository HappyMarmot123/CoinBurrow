# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm ci --workspace web --include-workspace-root=false

FROM dependencies AS development
ENV NODE_ENV=development

COPY web ./web

EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace", "web", "--", "--host", "0.0.0.0"]

FROM dependencies AS build
COPY web ./web
RUN --mount=type=secret,id=web_env,target=/app/web/.env.local,required=true \
    npm run build --workspace web

FROM nginx:1.27-alpine AS runtime
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html

EXPOSE 80
