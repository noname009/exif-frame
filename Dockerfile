# =========================================================
# EXIF Frame - Dockerfile (multi-stage)
#
# Stage 1: Build static assets with Node + Vite
# Stage 2: Serve with Nginx (lightweight, ~25MB final image)
#
# Designed to run on Synology DSM (Container Manager) and
# any standard Docker/Podman host.
# =========================================================

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder

WORKDIR /app/web

# Install build deps first for better layer caching.
# Use `npm install` instead of `npm ci` so the build remains robust
# against minor drift between package.json and package-lock.json
# (and against upstream packages that disappear from npm).
COPY web/package.json web/package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy source and build
COPY web/ ./

# The original build script invokes `bundle.js` which depends
# on the `zip` binary and is only used for the official mobile
# auto-update pipeline. Replace it with a plain vite build to
# keep the Docker image lean and self-contained.
RUN sed -i 's|"build": "rm -rf dist && tsc && vite build && node bundle.js"|"build": "tsc \&\& vite build"|' package.json \
 && npm run build

# ---------- Stage 2: runtime ----------
FROM nginx:1.27-alpine

# Copy our nginx config and the built site
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/web/dist /usr/share/nginx/html

# Non-root would be ideal, but the stock nginx image needs
# extra surgery to run rootless. We keep defaults for
# Synology compatibility.

EXPOSE 80

# Simple healthcheck so Synology shows a green status dot
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
