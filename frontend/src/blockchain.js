/**
 * Write operations (store, revoke) → need a connected wallet
 * Read operations (verify) → use public RPC, no wallet needed
 */

import { ethers } from "ethers";
import { getAccount, getConnectorClient, switchChain } from "wagmi/actions";
import CertificateVerifierABI from "./CertificateVerifier.json";
import { wagmiConfig, TARGET_CHAIN } from "./wagmiConfig";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";
const CONTRACT_ABI = CertificateVerifierABI.abi;

// RPC for read-only calls (no wallet needed). It must allow eth_getLogs over
// large block ranges: many free RPCs (e.g. 1rpc.io) now cap it at 50 blocks.
// Set VITE_SEPOLIA_RPC_URL to use your own endpoint instead.
const PUBLIC_RPC =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://sepolia.gateway.tenderly.co";

// Contract was deployed around block 10773623, so logs before this are skipped
const START_BLOCK = 10770000;
// Max block span per eth_getLogs request
const MAX_LOG_RANGE = 500000;

let readProvider;

/**
 * Get a read-only contract instance via public RPC.
 * Used for verifyCertificate - free, no wallet required.
 */
function getReadOnlyContract() {
  if (
    CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" ||
    !import.meta.env.VITE_CONTRACT_ADDRESS
  ) {
    throw new Error(
      "Contract address not set! Please set VITE_CONTRACT_ADDRESS in your Vercel Environment Variables or local .env file.",
    );
  }
  readProvider ??= new ethers.JsonRpcProvider(PUBLIC_RPC, TARGET_CHAIN.id, {
    staticNetwork: true,
  });
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
}

/**
 * Query event logs from START_BLOCK to the latest block in chunks.
 * Stops early if `stopWhen` returns true for a chunk's events.
 */
async function queryLogsInChunks(contract, filter, stopWhen) {
  const latestBlock = await contract.runner.provider.getBlockNumber();
  const events = [];
  for (let i = START_BLOCK; i <= latestBlock; i += MAX_LOG_RANGE) {
    const endBlock = Math.min(i + MAX_LOG_RANGE - 1, latestBlock);
    const chunk = await contract.queryFilter(filter, i, endBlock);
    events.push(...chunk);
    if (stopWhen?.(chunk)) break;
  }
  return events;
}

/**
 * Get a writable contract instance via the wallet connected in RainbowKit
 * (MetaMask, WalletConnect, Coinbase Wallet, ...), always on Sepolia.
 * Used for storeCertificate and revokeCertificate - requires a wallet.
 */
async function getWriteContract() {
  if (
    CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000" ||
    !import.meta.env.VITE_CONTRACT_ADDRESS
  ) {
    throw new Error(
      "Contract address not set! Please set VITE_CONTRACT_ADDRESS in your Vercel Environment Variables or local .env file.",
    );
  }

  const account = getAccount(wagmiConfig);
  if (!account.isConnected) {
    throw new Error("No wallet connected. Please connect your wallet first.");
  }

  // Never send a transaction on another chain (e.g. mainnet): there is no
  // contract there, so the user would pay real gas and nothing gets stored.
  if (account.chainId !== TARGET_CHAIN.id) {
    try {
      await switchChain(wagmiConfig, { chainId: TARGET_CHAIN.id });
    } catch {
      throw new Error(
        `Your wallet is on the wrong network. Please switch to ${TARGET_CHAIN.name} and try again.`,
      );
    }
  }

  // Throws if the connected wallet is still not on the target chain
  const client = await getConnectorClient(wagmiConfig, {
    chainId: TARGET_CHAIN.id,
  });
  const provider = new ethers.BrowserProvider(client.transport, {
    chainId: client.chain.id,
    name: client.chain.name,
  });
  const signer = new ethers.JsonRpcSigner(provider, client.account.address);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/** Store a certificate hash and metadata on-chain. Costs gas. */
export async function storeCertificateOnChain(
  hash,
  studentName,
  courseName,
  issuedDate,
  issuedBy,
) {
  try {
    const contract = await getWriteContract();
    const tx = await contract.storeCertificate(
      hash,
      studentName,
      courseName,
      issuedDate,
      issuedBy,
    );
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (err) {
    if (err.message.includes("network") || err.code === "NETWORK_ERROR") {
      throw new Error(
        "Network error: Unable to connect to the blockchain. Please check your internet connection or switch networks.",
      );
    }
    throw err;
  }
}

/** Verify a certificate hash. Free - uses public RPC. */
export async function verifyCertificateOnChain(hash) {
  try {
    const contract = getReadOnlyContract();
    return await contract.verifyCertificate(hash);
  } catch (err) {
    if (
      err.message.includes("network") ||
      err.code === "NETWORK_ERROR" ||
      err.message.includes("fetch")
    ) {
      throw new Error(
        "Network error: Unable to connect to the public blockchain node. Please try again later.",
      );
    }
    throw err;
  }
}

/** True if the hash was issued and later revoked by its issuer. Free. */
export async function isRevokedOnChain(hash) {
  const contract = getReadOnlyContract();
  return await contract.revoked(hash);
}

/** Revoke a certificate. Only the original issuer can call this. */
export async function revokeCertificateOnChain(hash) {
  try {
    const contract = await getWriteContract();
    const tx = await contract.revokeCertificate(hash);
    const receipt = await tx.wait();
    return receipt.hash;
  } catch (err) {
    throw err;
  }
}

/** Fetch all certificates issued by a wallet (reads CertificateStored events). */
export async function getIssuedCertificates(walletAddress) {
  try {
    const contract = getReadOnlyContract();
    const filter = contract.filters.CertificateStored(null, walletAddress);
    const events = await queryLogsInChunks(contract, filter);

    return events.map((event) => {
      // event.args: [hash, issuer, studentName, courseName, issuedDate, issuedBy]
      return {
        hash: event.args[0],
        issuer: event.args[1],
        studentName: event.args[2],
        courseName: event.args[3],
        issuedDate: event.args[4],
        issuedBy: event.args[5],
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
      };
    });
  } catch (err) {
    if (err.message.includes("network") || err.message.includes("fetch")) {
      throw new Error(
        "Network error: Failed to fetch your history from the blockchain.",
      );
    }
    throw err;
  }
}

/** Fetch details of a specific certificate by its hash from the event logs */
export async function getCertificateDetailsByHash(hash) {
  try {
    const contract = getReadOnlyContract();

    // The 'hash' parameter in CertificateStored is a string and NOT indexed.
    // We cannot filter by it directly. Instead, we first lookup the issuer.
    const issuer = await contract.issuers(hash);
    if (!issuer || issuer === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    // Now filter CertificateStored events by the indexed 'issuer' parameter
    const filter = contract.filters.CertificateStored(null, issuer);

    // Find the specific event that matches our string hash
    const isMatch = (event) => event.args[0] === hash;
    const events = await queryLogsInChunks(contract, filter, (chunk) =>
      chunk.some(isMatch),
    );
    const match = events.find(isMatch);
    if (!match) return null;

    return {
      hash: match.args[0],
      issuer: match.args[1],
      studentName: match.args[2],
      courseName: match.args[3],
      issuedDate: match.args[4],
      issuedBy: match.args[5],
    };
  } catch (err) {
    console.error("Failed to fetch certificate details:", err);
    return null;
  }
}
