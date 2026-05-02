/**
 * Landing page for ChainCred
 */

export default function Home({ onNavigate }) {
  return (
    <div className="home-container">
      {/* Dot-matrix clusters */}
      <div className="home-bg-wrapper">
        <div className="dot-cluster-tl" />
        <div className="dot-cluster-tr" />
        <div className="dot-cluster-br" />
        <div className="diagonal-overlay" />
      </div>

      {/* Hero */}
      <section className="hero-section">
        <h1 className="hero-title">
          Tamper-Proof
          <br />
          <span className="hero-subtitle-highlight">Digital Credentials.</span>
        </h1>

        <p className="hero-description">
          Issue and verify academic certificates on Ethereum. Every credential
          is hashed and stored immutably on-chain.
        </p>

        <div className="hero-actions">
          <button onClick={() => onNavigate("issue")} className="btn-primary">
            Issue Certificate ↗
          </button>
          <button
            onClick={() => onNavigate("verify")}
            className="btn-secondary"
          >
            Verify ↗
          </button>
        </div>
      </section>

      {/* Stats - 2 cols on mobile, 4 cols on desktop */}
      <section className="stats-section">
        <div className="stats-grid">
          {[
            { value: "SHA-256", label: "Hash Algorithm" },
            { value: "Sepolia", label: "Testnet" },
            { value: "100%", label: "Tamper Proof" },
            { value: "Free", label: "Verification" },
          ].map(({ value, label }) => (
            <div key={label} className="stat-item">
              <p className="stat-value">{value}</p>
              <p className="stat-label">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works - stacked on mobile, 3 cols on desktop */}
      <section className="how-it-works-section">
        <div className="how-it-works-container">
          <h2 className="how-it-works-title">How It Works</h2>

          <div className="how-it-works-grid">
            {[
              {
                step: "01",
                title: "Issue",
                desc: "Connect wallet, fill in certificate details, and store the SHA-256 hash on Ethereum.",
              },
              {
                step: "02",
                title: "Share",
                desc: "Get a unique hash and QR code. Share it with the certificate holder.",
              },
              {
                step: "03",
                title: "Verify",
                desc: "Anyone can re-enter the details to check authenticity on-chain. No wallet needed.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="step-card">
                <span className="step-number">{step}</span>
                <h3 className="step-title">{title}</h3>
                <p className="step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-container">
          {/* Left - branding */}
          <div className="footer-brand">
            <img src="/logo.png" alt="ChainCred" className="footer-logo" />
            <span className="footer-text">
              ChainCred | Built with Solidity, React & ethers.js
            </span>
          </div>

          {/* Right - links */}
          <div className="footer-links">
            <a
              href="https://aravarun.xyz"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              aravarun.xyz ↗
            </a>
            <a
              href={
                import.meta.env.VITE_CONTRACT_ADDRESS
                  ? `https://sepolia.etherscan.io/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`
                  : "#"
              }
              target={
                import.meta.env.VITE_CONTRACT_ADDRESS ? "_blank" : "_self"
              }
              rel="noreferrer"
              onClick={(e) => {
                if (!import.meta.env.VITE_CONTRACT_ADDRESS) {
                  e.preventDefault();
                  alert(
                    "Contract address not set! Please set VITE_CONTRACT_ADDRESS in your Vercel Environment Variables or local .env file.",
                  );
                }
              }}
              className="footer-link"
            >
              View Contract ↗
            </a>
            <a
              href="https://github.com/Arav-Arun/ChainCred"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
