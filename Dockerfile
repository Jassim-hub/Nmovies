FROM node:22-slim AS base
WORKDIR /app

# ── Install main app dependencies ─────────────────────────────────────────────
FROM base AS main-deps
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# ── Install panel app dependencies ────────────────────────────────────────────
FROM base AS panel-deps
COPY panel/package.json panel/package-lock.json* ./
RUN npm install --legacy-peer-deps

# ── Build main app ────────────────────────────────────────────────────────────
FROM base AS main-builder
COPY --from=main-deps /app/node_modules ./node_modules
COPY . .
# Remove panel from the main build context to avoid confusion
RUN npm run build

# ── Build panel app ───────────────────────────────────────────────────────────
FROM base AS panel-builder
COPY --from=panel-deps /app/node_modules ./panel/node_modules
COPY panel/ ./panel/
WORKDIR /app/panel
# Ensure public dir exists even if panel doesn't have one
RUN mkdir -p public
RUN npm run build

# ── Final production image ────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# Install concurrently to run both servers
RUN npm install -g concurrently

# Copy main app
COPY --from=main-builder /app/.next ./.next
COPY --from=main-builder /app/public ./public
COPY --from=main-builder /app/node_modules ./node_modules
COPY --from=main-builder /app/package.json ./package.json
COPY --from=main-builder /app/next.config.ts ./next.config.ts

# Copy panel app
COPY --from=panel-builder /app/panel/.next ./panel/.next
COPY --from=panel-builder /app/panel/public ./panel/public
COPY --from=panel-builder /app/panel/node_modules ./panel/node_modules
COPY --from=panel-builder /app/panel/package.json ./panel/package.json
COPY --from=panel-builder /app/panel/next.config.ts ./panel/next.config.ts

EXPOSE 4577 3001

CMD ["concurrently", "\"next start -p 4577\"", "\"cd panel && next start -p 3001\""]
