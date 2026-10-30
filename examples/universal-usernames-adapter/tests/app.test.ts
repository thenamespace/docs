import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { lookupUser } from '../src/users.js';

const schema = JSON.parse(
  readFileSync(new URL('../schema/profile-v1.schema.json', import.meta.url), 'utf8'),
);
const validateProfile = new Ajv2020({ allErrors: true }).compile(schema);

// The headers Namespace sends on every lookup.
const namespaceHeaders = {
  Accept: 'application/json',
  'User-Agent': 'Namespace-UniversalUsernames/1',
};

describe('universal usernames endpoint', () => {
  const app = createApp({ lookupUser });

  it('returns a schema v1 profile for an existing username', async () => {
    const response = await app.request('/happy', { headers: namespaceHeaders });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json(;|$)/);
    const body = await response.json();
    expect(validateProfile(body), JSON.stringify(validateProfile.errors)).toBe(true);
    expect(body).toMatchObject({
      version: 1,
      username: 'happy',
      addresses: { '60': '0x1111111111111111111111111111111111111111' },
    });
  });

  it('decodes a percent-encoded username and echoes it unchanged', async () => {
    const response = await app.request(`/${encodeURIComponent('café')}`, {
      headers: namespaceHeaders,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(validateProfile(body)).toBe(true);
    expect(body.username).toBe('café');
    expect(body).not.toHaveProperty('contenthash');
  });

  it('returns 404 with JSON for a username that does not exist', async () => {
    const response = await app.request('/nobody', { headers: namespaceHeaders });

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
  });

  it.each(['/', '/happy/extra', '/happy/'])('returns 404 for the unknown path %s', async (path) => {
    const response = await app.request(path, { headers: namespaceHeaders });

    expect(response.status).toBe(404);
  });

  it('returns 500, not 404, when the user store fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = createApp({
      lookupUser: async () => {
        throw new Error('database unavailable');
      },
    });

    const response = await failing.request('/happy', { headers: namespaceHeaders });

    expect(response.status).toBe(500);
  });
});

describe('universal usernames endpoint with a bearer token', () => {
  const endpointToken = 'test-token-0b6f2d9e8c4a';
  const app = createApp({ lookupUser, endpointToken });

  it('returns the profile when the token matches', async () => {
    const response = await app.request('/happy', {
      headers: { ...namespaceHeaders, Authorization: `Bearer ${endpointToken}` },
    });

    expect(response.status).toBe(200);
    expect(validateProfile(await response.json())).toBe(true);
  });

  it('returns 401 when the Authorization header is missing', async () => {
    const response = await app.request('/happy', { headers: namespaceHeaders });

    expect(response.status).toBe(401);
  });

  it.each([
    ['a wrong token', 'Bearer wrong-token'],
    ['a token prefix', `Bearer ${endpointToken.slice(0, -1)}`],
    ['another scheme', `Basic ${endpointToken}`],
  ])('returns 401 for %s', async (_case, authorization) => {
    const response = await app.request('/happy', {
      headers: { ...namespaceHeaders, Authorization: authorization },
    });

    expect(response.status).toBe(401);
  });

  it('checks the token before revealing whether a username exists', async () => {
    const response = await app.request('/nobody', {
      headers: { ...namespaceHeaders, Authorization: 'Bearer wrong-token' },
    });

    expect(response.status).toBe(401);
  });
});
