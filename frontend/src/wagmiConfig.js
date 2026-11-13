/**
 * Shared wagmi config, used by the React providers (App.jsx) and by
 * blockchain.js to sign transactions with the RainbowKit-connected wallet.
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const TARGET_CHAIN = sepolia;

export const wagmiConfig = getDefaultConfig({
  appName: "ChainCred",
  projectId: import.meta.env.VITE_WC_PROJECT_ID,
  chains: [TARGET_CHAIN],
});
