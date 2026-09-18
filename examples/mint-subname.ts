import 'dotenv/config';
import {
  ChainName,
  MintManagerError,
  createMintClient,
} from '@thenamespace/mint-manager';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
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

// One RPC endpoint shared by the SDK's reads and the viem clients, so the
// availability check and the transaction that follows cannot disagree about
// chain state because they hit different providers.
const mintClient = createMintClient({
  customRpcUrls: { [base.id]: rpcUrl },
  mintSource: 'namespace-docs-example',
});
const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(rpcUrl),
});

const fullName = 'alice.example.eth';

async function main() {
  // One call covers whether the name is free and whether this address may
  // mint it. The chain comes from the listing, so it is never passed in.
  const check = await mintClient.checkName(fullName, {
    minterAddress: account.address,
    expiryInYears: 1,
  });

  if (check.status !== 'available') {
    throw new Error(`${fullName} is ${check.status}: ${check.reasons.join(', ')}`);
  }

  // Cap what the signed quote is allowed to charge. Without this, a price
  // that moves between the quote and the signature is simply charged.
  const quoted = parseEther(
    (check.estimatedPriceEth + check.estimatedFeeEth).toFixed(18),
  );

  const transaction = await mintClient.prepareMint(check, {
    minterAddress: account.address,
    owner: account.address,
    expiryInYears: 1,
    maxValue: quoted,
    records: {
      addresses: [{ chain: ChainName.Ethereum, value: account.address }],
      texts: [{ key: 'description', value: 'Minted with Namespace' }],
    },
  });

  // Simulating first surfaces a revert reason without spending gas.
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
  if (error instanceof MintManagerError) {
    // Codes are stable; match on them rather than on message text.
    console.error(error.code, error.message, error.details);
    process.exitCode = 1;
    return;
  }

  console.error(error);
  process.exitCode = 1;
});
