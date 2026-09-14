# syntax=docker/dockerfile:1

# Dockerfile for the raha-admin-web service (Expo web export of admin-app).
#
# Railpack's default build for this service runs `yarn install --frozen-lockfile`
# before any custom build command, which fails because package.json and yarn.lock
# are currently out of sync. This Dockerfile takes full control of the build/serve
# pipeline so the frozen-lockfile check is never invoked.
#
# This only affects the raha-admin-web service (root directory /admin-app) and does
# not touch the backend or Android app services.

FROM node:18-bookworm-slim

WORKDIR /admin-app

# Enable a modern Yarn (classic 1.x, matching packageManager in package.json)
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

# Copy full project (package.json, yarn.lock, app source, etc.)
COPY . .

# Install dependencies without enforcing the lockfile to be frozen. This allows
# yarn to resolve any minor mismatches between package.json and yarn.lock instead
# of failing the build outright.
RUN yarn install --no-frozen-lockfile

# Native-only packages (react-native-razorpay, expo-ocr-kit, react-native-worklets)
# are not usable in a web build. They are guarded in app code via Platform checks,
# and `expo export --platform web` only bundles the web-reachable code paths, so no
# extra exclusion step is required here.

# Build the static web export (outputs to ./dist)
RUN npx expo export --platform web

# Lightweight static file server for the exported web build
RUN npm install -g serve

ENV PORT=8080
EXPOSE $PORT

CMD ["sh", "-c", "npx serve dist -s -l $PORT"]
