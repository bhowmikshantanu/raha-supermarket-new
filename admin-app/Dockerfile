# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json yarn.lock ./
COPY scripts ./scripts

# Use a plain install (not --frozen-lockfile) so the lockfile can be
# reconciled with package.json (including the "resolutions" overrides)
# without failing the build.
RUN yarn install --no-frozen-lockfile

# Copy the rest of the source and build the static web export.
COPY . .

RUN npx expo export --platform web

# ---- Runtime stage ----------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY server.js ./server.js

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
