import 'dotenv/config';
import { namehash, normalize } from 'viem/ens';
import { privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';

// Pauses a universal usernames connection through the owner API.
// Every change is authorized by one SIWE message signed by the parent's owner.

const API_URL = 'https://offchain-manager.namespace.ninja';
const CHAIN_ID = 1; // 11155111 with https://staging.offchain-manager.namespace.ninja
const SIWE_DOMAIN = 'app.namespace.ninja';

const ownerKey = process.env.OWNER_PRIVATE_KEY;
if (!ownerKey?.startsWith('0x')) {
  throw new Error('Set OWNER_PRIVATE_KEY to the 0x-prefixed key of the wallet that owns the parent.');
}
const owner = privateKeyToAccount(ownerKey as `0x${string}`);

type Action = 'save' | 'activate' | 'rotate-credential' | 'pause' | 'resume' | 'disconnect';

function toAuthToken(message: string, signature: string): string {
  return `siwe:${btoa(message)}.${btoa(signature)}`;
}

async function signOperation(parentName: string, action: Action, expectedRevision: number) {
  const nonceResponse = await fetch(`${API_URL}/api/v1/auth/nonce`);
  if (!nonceResponse.ok) throw new Error(`Nonce request failed: ${nonceResponse.status}`);
  const nonce = await nonceResponse.text();

  const issuedAt = new Date();
  const message = createSiweMessage({
    domain: SIWE_DOMAIN,
    uri: `https://${SIWE_DOMAIN}`,
    address: owner.address,
    statement: `Authorize ${action} for Universal Usernames on ${parentName}`,
    version: '1',
    chainId: CHAIN_ID,
    nonce,
    issuedAt,
    expirationTime: new Date(issuedAt.getTime() + 5 * 60 * 1000),
    resources: [`urn:namespace:uun:${namehash(parentName)}:${action}:${expectedRevision}`],
  });
  const signature = await owner.signMessage({ message });
  return toAuthToken(message, signature);
}

async function signSession() {
  const nonceResponse = await fetch(`${API_URL}/api/v1/auth/nonce`);
  if (!nonceResponse.ok) throw new Error(`Nonce request failed: ${nonceResponse.status}`);

  const issuedAt = new Date();
  const message = createSiweMessage({
    domain: SIWE_DOMAIN,
    uri: `https://${SIWE_DOMAIN}`,
    address: owner.address,
    version: '1',
    chainId: CHAIN_ID,
    nonce: await nonceResponse.text(),
    issuedAt,
    expirationTime: new Date(issuedAt.getTime() + 60 * 60 * 1000),
  });
  return toAuthToken(message, await owner.signMessage({ message }));
}

async function main() {
  const parentName = normalize('brand.eth');
  const connectionUrl = `${API_URL}/api/v1/universal-usernames/${encodeURIComponent(parentName)}`;

  const current = await fetch(connectionUrl, { headers: { 'x-auth-token': await signSession() } });
  if (!current.ok) throw new Error(`Reading the connection failed: ${current.status} ${await current.text()}`);
  const { revision } = (await current.json()) as { revision: number };

  const paused = await fetch(`${connectionUrl}/pause`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-auth-token': await signOperation(parentName, 'pause', revision),
    },
    body: JSON.stringify({ expectedRevision: revision }),
  });
  if (!paused.ok) throw new Error(`Pause failed: ${paused.status} ${await paused.text()}`);

  const connection = (await paused.json()) as { status: string; revision: number };
  console.log(`${parentName} is ${connection.status} at revision ${connection.revision}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
