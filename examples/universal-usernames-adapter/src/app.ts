import { Hono } from 'hono';
import { isAuthorizedBearer } from './bearer-token.js';
import type { UsernameProfileV1 } from './profile.js';

/** Returns the profile for a username, or null when the username doesn't exist. */
export type LookupUser = (username: string) => Promise<UsernameProfileV1 | null>;

export interface AppOptions {
  lookupUser: LookupUser;
  /** When set, every request must send `Authorization: Bearer <endpointToken>`. */
  endpointToken?: string;
}

/**
 * Namespace calls GET {your endpoint URL}/{username}, where username is one
 * ENSIP-15 normalized label. Answer 200 with the profile, or 404 when the
 * username doesn't exist. Any other status is treated as an outage, never as
 * "no such user".
 */
export function createApp({ lookupUser, endpointToken }: AppOptions): Hono {
  const app = new Hono();

  if (endpointToken) {
    app.use('*', async (c, next) => {
      if (!isAuthorizedBearer(c.req.header('Authorization'), endpointToken)) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      await next();
    });
  }

  app.get('/:username', async (c) => {
    // Hono decodes the percent-encoded label, so "caf%C3%A9" arrives as "café".
    const username = c.req.param('username');
    const profile = await lookupUser(username);
    if (!profile) return c.json({ error: 'not_found' }, 404);
    return c.json(profile);
  });

  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  // A failing user store must not look like a missing user, so it gets a 500.
  app.onError((error, c) => {
    console.error('Username lookup failed', error);
    return c.json({ error: 'internal_error' }, 500);
  });

  return app;
}
