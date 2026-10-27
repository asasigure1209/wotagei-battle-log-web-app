# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Database

The schema lives in `server/db/schema.ts` (Drizzle ORM, SQLite). In production the database is Cloudflare D1. The app runs on Vercel and cannot bind to D1 directly, so it sends SQL to a small proxy Worker (`workers/d1-proxy`) that runs it on D1.

| Environment variable | Meaning |
| --- | --- |
| `NUXT_D1_PROXY_URL` | URL of the proxy Worker. When set, the app uses D1 through it |
| `NUXT_D1_PROXY_TOKEN` | Must match the Worker's `PROXY_TOKEN` |
| `NUXT_DATABASE_URL` | Local SQLite file used when `NUXT_D1_PROXY_URL` is unset (default `file:.data/db.sqlite`) |

### Local development

```bash
# Create the local DB and fill it with the sample data
bun run db:migrate
bun run db:seed

# After changing server/db/schema.ts, generate a migration
bun run db:generate --name <what-changed>
```

To try the D1 setup locally, run the proxy Worker against a local D1:

```bash
echo 'PROXY_TOKEN=local-proxy-token' > workers/d1-proxy/.dev.vars
bun run d1:migrate:local
bun run d1-proxy:dev   # http://localhost:8787

export NUXT_D1_PROXY_URL=http://localhost:8787 NUXT_D1_PROXY_TOKEN=local-proxy-token
bun run db:seed --allow-d1-proxy
bun run dev
```

`db:seed` deletes everything first, so it refuses to run through the proxy Worker unless `--allow-d1-proxy` is given. Never give it while pointing at the production Worker.

### Production (first time)

```bash
bunx wrangler login
bunx wrangler d1 create wotagei-battle-log   # write the printed database_id into workers/d1-proxy/wrangler.toml
bun run d1:migrate:remote
bunx wrangler secret put PROXY_TOKEN -c workers/d1-proxy/wrangler.toml   # a long random value
bun run d1-proxy:deploy
```

Then set `NUXT_D1_PROXY_URL` (the deployed Worker's URL) and `NUXT_D1_PROXY_TOKEN` (the same value as `PROXY_TOKEN`) in the Vercel project's environment variables. After adding a migration, run `bun run d1:migrate:remote` again.

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
