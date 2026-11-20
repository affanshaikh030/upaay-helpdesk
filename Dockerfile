# One image for the whole app: the Express API (with the pg-boss worker in the same process)
# serves the built React client, so the browser talks to a single origin.
FROM oven/bun:1

WORKDIR /app

# Dependencies first, so this layer is cached until a package file or the lockfile changes.
# The workspace package.json files are needed for a frozen install.
COPY package.json bun.lock ./
COPY client/package.json client/
COPY server/package.json server/
COPY core/package.json core/
RUN bun install --frozen-lockfile

COPY . .

# Generate the Prisma client for the schema in this image. generate never connects to a
# database, but the Prisma config reads DATABASE_URL, so give this one command a dummy value
# (the real one is only set at runtime, by Railway).
RUN cd server && DATABASE_URL="postgresql://placeholder@localhost:5432/placeholder" bunx --bun prisma generate

# VITE_SENTRY_DSN is baked into the client bundle at build time. Railway only passes it to a
# Dockerfile build when it is declared here. It is a public client key, not a secret.
ARG VITE_SENTRY_DSN
RUN cd client && bun run build

# Set after install and build so devDependencies (the prisma CLI) stay available
ENV NODE_ENV=production

WORKDIR /app/server

# Run bun directly (not through `bun run`) so SIGTERM reaches the app and it shuts down gracefully
CMD ["bun", "--preload", "./src/instrument.ts", "src/index.ts"]
