import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { lookupUser } from './users.js';

const port = Number(process.env.PORT ?? 8787);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`PORT must be a positive integer, got "${process.env.PORT}"`);
}

const endpointToken = process.env.ENDPOINT_TOKEN || undefined;
const app = createApp({ lookupUser, endpointToken });

serve({ fetch: app.fetch, port }, (info) => {
  const auth = endpointToken ? 'bearer token required' : 'no bearer token';
  console.log(`Universal usernames endpoint on http://localhost:${info.port} (${auth})`);
});
