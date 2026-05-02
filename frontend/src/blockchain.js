/**
 * Write operations (store, revoke) → need a connected wallet
 * Read operations (verify) → use public RPC, no wallet needed
 */

import { ethers } from "ethers";
import CertificateVerifierABI from "./CertificateVerifier.json";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";
const CONTRACT_ABI = CertificateVerifierABI.abi;

// Public RPC for read-only calls (no wallet needed)
const PUBLIC_RPC = "https://1rpc.io/sepolia";

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
  const provider = new ethers.JsonRpcProvider(PUBLIC_RPC);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Get a writable contract instance via the user's wallet.
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
  if (!window.ethereum) {
    throw new Error("No wallet found. Please install a Web3 wallet.");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
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

    // Public RPC nodes often limit eth_getLogs to a 50k block range.
    // Since the contract was deployed around block 10773623, we start near there.
    const START_BLOCK = 10770000;
    const latestBlock = await contract.runner.provider.getBlockNumber();

    const events = [];
    const MAX_RANGE = 40000;

    for (let i = START_BLOCK; i <= latestBlock; i += MAX_RANGE) {
      const endBlock = Math.min(i + MAX_RANGE - 1, latestBlock);
      const chunk = await contract.queryFilter(filter, i, endBlock);
      events.push(...chunk);
    }

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

    const START_BLOCK = 10770000;
    const latestBlock = await contract.runner.provider.getBlockNumber();
    const MAX_RANGE = 40000;

    for (let i = START_BLOCK; i <= latestBlock; i += MAX_RANGE) {
      const endBlock = Math.min(i + MAX_RANGE - 1, latestBlock);
      const chunk = await contract.queryFilter(filter, i, endBlock);

      // Find the specific event that matches our string hash
      const match = chunk.find((event) => event.args[0] === hash);
      if (match) {
        return {
          hash: match.args[0],
          issuer: match.args[1],
          studentName: match.args[2],
          courseName: match.args[3],
          issuedDate: match.args[4],
          issuedBy: match.args[5],
        };
      }
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch certificate details:", err);
    return null;
  }
}
