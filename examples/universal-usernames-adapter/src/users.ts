import type { UsernameProfileV1 } from './profile.js';

/**
 * Stand-in for your user store. Replace lookupUser with a query against your
 * database or user service. Key users by their ENSIP-15 normalized username,
 * which is the form Namespace sends.
 */
interface BrandUser {
  displayName: string;
  avatarUrl?: string;
  github?: string;
  role: string;
  ethereumAddress?: string;
  baseAddress?: string;
  bitcoinAddress?: string;
  website?: string;
  /** IPFS site for the user's page, if they have one. */
  siteContenthash?: string;
}

const users = new Map<string, BrandUser>([
  [
    'happy',
    {
      displayName: 'Happy',
      avatarUrl: 'https://cdn.brand.example/happy.png',
      github: 'happy',
      role: 'member',
      ethereumAddress: '0x1111111111111111111111111111111111111111',
      baseAddress: '0x2222222222222222222222222222222222222222',
      bitcoinAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      siteContenthash: 'ipfs://QmYwAPJzv5CZsnAzt8auVZRnGiRAzQmmJYDh4T7SEBuwNA',
    },
  ],
  [
    'café',
    {
      displayName: 'Café',
      role: 'member',
      ethereumAddress: '0x3333333333333333333333333333333333333333',
      website: 'https://cafe.brand.example',
    },
  ],
]);

// ENS coin types (ENSIP-9 and ENSIP-11), not chain IDs.
const COIN_TYPE = {
  bitcoin: '0',
  ethereum: '60',
  base: '2147492101',
} as const;

export async function lookupUser(username: string): Promise<UsernameProfileV1 | null> {
  const user = users.get(username);
  if (!user) return null;
  return toProfile(username, user);
}

function toProfile(username: string, user: BrandUser): UsernameProfileV1 {
  const texts: Record<string, string> = { name: user.displayName, 'com.brand.role': user.role };
  if (user.avatarUrl) texts.avatar = user.avatarUrl;
  if (user.github) texts['com.github'] = user.github;
  if (user.website) texts.url = user.website;

  const addresses: Record<string, string> = {};
  if (user.ethereumAddress) addresses[COIN_TYPE.ethereum] = user.ethereumAddress;
  if (user.baseAddress) addresses[COIN_TYPE.base] = user.baseAddress;
  if (user.bitcoinAddress) addresses[COIN_TYPE.bitcoin] = user.bitcoinAddress;

  // Echo the requested username exactly; a different value fails the whole profile.
  const profile: UsernameProfileV1 = { version: 1, username, texts, addresses };
  if (user.siteContenthash) profile.contenthash = user.siteContenthash;
  return profile;
}
