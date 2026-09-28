# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json yarn.lock ./
COPY scripts ./scripts

# Plain `yarn install` (no --frozen-lockfile): respects yarn.lock but tolerates
# drift between package.json and yarn.lock instead of hard-failing the install.
RUN yarn install

# Now copy the rest of the source and export the web bundle.
COPY . .

# Native-only packages (e.g. react-native-firebase, razorpay) are skipped by
# Expo's web export automatically; Android behavior is untouched.
RUN npx expo export --platform web

# ---- Runtime stage ----------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=build /app/dist ./dist

EXPOSE 3000

# -s enables SPA fallback (index.html) for client-side routing via expo-router.
CMD ["sh", "-c", "npx serve dist -s -l $PORT"]
