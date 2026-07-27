import 'dotenv/config';
import {
  ChainName,
  createOffchainClient,
} from '@thenamespace/offchain-manager';

const apiKey = process.env.NAMESPACE_API_KEY;

if (!apiKey) {
  throw new Error('Set NAMESPACE_API_KEY before running this example.');
}

const client = createOffchainClient({
  mode: 'sepolia',
  defaultApiKey: apiKey,
});

const parentName = 'example.eth';
const label = 'alice';
const fullName = `${label}.${parentName}`;
const owner = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

async function main() {
  const { isAvailable } = await client.isSubnameAvailable(fullName);

  if (!isAvailable) {
    throw new Error(`${fullName} is already registered.`);
  }

  await client.createSubname({
    parentName,
    label,
    owner,
    addresses: [{ chain: ChainName.Ethereum, value: owner }],
    texts: [{ key: 'name', value: 'Alice' }],
    metadata: [{ key: 'source', value: 'namespace-docs-example' }],
  });

  const created = await client.getSingleSubname(fullName);
  console.log(created);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
