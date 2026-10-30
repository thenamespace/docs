# Universal usernames adapter template

A small endpoint that serves your users' profiles to Namespace, so each username in your system resolves as `username.brand.eth` through ENS. It uses [Hono](https://hono.dev) and TypeScript and runs on Node.js.

Namespace calls `GET {your endpoint URL}/{username}`. The endpoint answers `200` with a profile JSON, or `404` when the username doesn't exist. The full contract is in the [endpoint reference](https://docs.namespace.ninja/developer-guide/universal-usernames/endpoint-reference).

## Requirements

- Node.js 22.12 or later
- npm

## Run it locally

```bash
npm install
npm run dev
```

The endpoint listens on `http://localhost:8787`. Try the two sample users and a missing one:

```bash
curl -i http://localhost:8787/happy
curl -i http://localhost:8787/caf%C3%A9
curl -i http://localhost:8787/nobody   # 404
```

`happy` returns:

```json
{
  "version": 1,
  "username": "happy",
  "texts": {
    "name": "Happy",
    "com.brand.role": "member",
    "avatar": "https://cdn.brand.example/happy.png",
    "com.github": "happy"
  },
  "addresses": {
    "0": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    "60": "0x1111111111111111111111111111111111111111",
    "2147492101": "0x2222222222222222222222222222222222222222"
  },
  "contenthash": "ipfs://QmYwAPJzv5CZsnAzt8auVZRnGiRAzQmmJYDh4T7SEBuwNA"
}
```

## Run the tests

```bash
npm test
npm run typecheck
```

The tests check a `200` response against the profile schema in `schema/profile-v1.schema.json`, the `404` for a missing username and unknown paths, the `500` when your user store fails, and the bearer token check.

## Connect your user store

Replace `lookupUser` in `src/users.ts` with a query against your database or user service. Keep these rules:

- Look users up by their [ENSIP-15](https://docs.ens.domains/ensip/15) normalized username. Namespace only sends normalized labels, for example `happy`, never `Happy`.
- Return `null` when the user doesn't exist. The app turns that into a `404`, and wallets see an empty result.
- Throw when your store fails. The app returns a `500`, and wallets see an error instead of a wrong "no such user".
- Echo the requested username in `username`. Any other value fails the whole profile.
- Key addresses by decimal ENS coin type, such as `60` for Ethereum and `0` for Bitcoin, not by chain ID. Leave missing records out; never send `null`.

Everything the endpoint returns is public once it resolves through ENS, even with a bearer token.

## Require a bearer token

Copy `.env.example` to `.env` and set `ENDPOINT_TOKEN` to a long random value:

```bash
cp .env.example .env
openssl rand -hex 32
```

With `ENDPOINT_TOKEN` set, every request must send `Authorization: Bearer <token>`, or the endpoint answers `401`. Enter the same value as the bearer credential when you connect the endpoint in the Namespace App. The token only keeps other callers off your endpoint. It doesn't make the records private.

## Deploy

```bash
npm run build
npm start
```

Run it behind HTTPS on any Node.js host. Namespace only calls `https://` URLs and doesn't follow redirects, so connect the final URL. The URL you connect is the base: with `https://usernames.brand.example`, Namespace requests `https://usernames.brand.example/happy`.

To serve the endpoint under a path such as `/ens/users`, mount the app there in `src/server.ts` and serve `root` instead:

```ts
import { Hono } from 'hono';

const root = new Hono();
root.route('/ens/users', createApp({ lookupUser, endpointToken }));

serve({ fetch: root.fetch, port });
```

Then connect `https://api.brand.example/ens/users`.

## Validate before you connect

Check the deployed endpoint with the validator CLI from `@thenamespace/universal-usernames`. It makes the same request Namespace makes and prints every problem it finds, with the JSON path of each one:

```bash
npx @thenamespace/universal-usernames validate https://usernames.brand.example --username happy
npx @thenamespace/universal-usernames validate https://usernames.brand.example --username happy --token "$ENDPOINT_TOKEN"
```

It exits with `0` when the profile is valid and `1` otherwise. The CLI is available once `@thenamespace/universal-usernames` 0.1.0 is published on npm.

## Connect it to your .eth name

In the [Namespace App](https://app.namespace.ninja/offchain), connect your `.eth` name to the endpoint URL with the wallet that owns the name. The [integration guide](https://docs.namespace.ninja/developer-guide/guide/connect-universal-usernames) walks through each step.
