import 'dotenv/config';
import { ChainName, createMintClient } from '@thenamespace/mint-manager';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const rpcUrl = process.env.BASE_RPC_URL;
const privateKey = process.env.WALLET_PRIVATE_KEY as Hex | undefined;

if (!rpcUrl) {
  throw new Error('Set BASE_RPC_URL before running this example.');
}

if (!privateKey) {
  throw new Error('Set WALLET_PRIVATE_KEY before running this example.');
}

const account = privateKeyToAccount(privateKey);
const mintClient = createMintClient({
  // The v1.1.1 SDK exports this configuration key with this spelling.
  cursomRpcUrls: { [base.id]: rpcUrl },
  mintSource: 'namespace-docs-example',
});
const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(rpcUrl),
});

const parentName = 'example.eth';
const label = 'alice';

async function main() {
  const fullName = `${label}.${parentName}`;
  const isAvailable = await mintClient.isL2SubnameAvailable(fullName, base.id);

  if (!isAvailable) {
    throw new Error(`${fullName} is not available on Base.`);
  }

  const details = await mintClient.getMintDetails({
    parentName,
    label,
    minterAddress: account.address,
  });

  if (!details.canMint) {
    throw new Error(details.validationErrors.join(', '));
  }

  const transaction = await mintClient.getMintTransactionParameters({
    parentName,
    label,
    minterAddress: account.address,
    owner: account.address,
    records: {
      addresses: [{ chain: ChainName.Ethereum, value: account.address }],
      texts: [{ key: 'description', value: 'Minted with Namespace' }],
    },
  });

  const { request } = await publicClient.simulateContract({
    account,
    address: transaction.contractAddress,
    abi: transaction.abi,
    functionName: transaction.functionName,
    args: transaction.args,
    value: transaction.value,
  });

  const hash = await walletClient.writeContract(request);
  console.log(hash);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
