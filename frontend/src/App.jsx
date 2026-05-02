/**
 * Four pages: Home, Issue, Verify, My Certificates.
 * Wallet connection via RainbowKit.
 */

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
  darkTheme,
} from "@rainbow-me/rainbowkit";

import Home from "./Home";
import IssueCertificate from "./IssueCertificate";
import VerifyCertificate from "./VerifyCertificate";
import MyCertificates from "./MyCertificates";

const config = getDefaultConfig({
  appName: "ChainCred",
  projectId: import.meta.env.VITE_WC_PROJECT_ID,
  chains: [sepolia],
});

const queryClient = new QueryClient();

const TABS = [
  { id: "home", label: "Home" },
  { id: "issue", label: "Issue" },
  { id: "verify", label: "Verify" },
  { id: "mycerts", label: "My Certificates" },
];

function AppContent() {
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "home";
  });

  return (
    <div className="app-container">
      {/* Nav - two rows on mobile, single row on desktop */}
      <header className="app-header">
        {/* Top row: logo + wallet */}
        <div className="header-top">
          <button onClick={() => setTab("home")} className="logo-btn">
            <img src="/logo.png" alt="ChainCred" className="logo-img" />
            <span className="logo-text">ChainCred</span>
          </button>

          {/* Desktop nav - hidden on mobile */}
          <nav className="desktop-nav">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`nav-btn ${tab === t.id ? "nav-btn-active" : "nav-btn-inactive"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== "loading";
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === "authenticated");
              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          type="button"
                          className="wallet-btn-connect"
                        >
                          Connect Wallet
                        </button>
                      );
                    }
                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="wallet-btn-wrong"
                        >
                          Wrong network
                        </button>
                      );
                    }
                    return (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="wallet-btn-account"
                        >
                          {account.displayName}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>

        {/* Mobile nav - horizontal scroll, visible only on small screens */}
        <div className="mobile-nav-container">
          <div className="mobile-nav">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`mobile-nav-btn ${tab === t.id ? "nav-btn-active" : "mobile-nav-btn-inactive"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Pages - extra top padding on mobile for two-row nav */}
      <main className="app-main">
        {tab === "home" && <Home onNavigate={setTab} />}
        {tab === "issue" && (
          <div className="page-container">
            <IssueCertificate />
          </div>
        )}
        {tab === "verify" && (
          <div className="page-container">
            <VerifyCertificate />
          </div>
        )}
        {tab === "mycerts" && (
          <div className="page-container-wide">
            <MyCertificates />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#333",
            accentColorForeground: "white",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <AppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
