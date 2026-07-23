# Dev/serve image for the Angular BTDS GUI (ng serve on 8035).
# Prefer official Node image over ubuntu+nodesource curl|bash install.
FROM node:18-bookworm

WORKDIR /usr/src/app

# Enable pnpm via Corepack (lockfile is pnpm-lock.yaml)
RUN corepack enable

# Install dependencies first for better layer caching
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Application sources (.dockerignore excludes node_modules, secrets catalogs, etc.)
COPY --chown=node:node . .

USER node

EXPOSE 8035

ENTRYPOINT ["pnpm", "exec", "ng", "serve"]
CMD ["--host", "0.0.0.0", "--port", "8035"]
