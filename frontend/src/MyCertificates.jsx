/**
 * Reads CertificateStored events from the blockchain.
 * Shows QR code, status, Etherscan link, and revoke button.
 */

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import {
  getIssuedCertificates,
  verifyCertificateOnChain,
  revokeCertificateOnChain,
} from "./blockchain";

export default function MyCertificates() {
  const { address, isConnected } = useAccount();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    if (isConnected && address) fetchCerts();
  }, [isConnected, address]);

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const events = await getIssuedCertificates(address);

      // Enrich each event with on-chain status
      const enriched = await Promise.all(
        events.map(async (cert) => {
          const isValid = await verifyCertificateOnChain(cert.hash);
          return { ...cert, valid: isValid };
        }),
      );

      setCerts(enriched);
    } catch (err) {
      console.error("Failed to fetch certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (hash) => {
    if (!confirm("Revoke this certificate? This cannot be undone.")) return;
    setRevoking(hash);
    try {
      await revokeCertificateOnChain(hash);
      await fetchCerts();
    } catch (err) {
      alert("Revocation failed: " + err.message);
    } finally {
      setRevoking(null);
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <h1 className="page-header">My Certificates</h1>
        <p className="page-description">
          Connect your wallet to view certificates you've issued.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">My Certificates</h1>
          <p className="text-sm text-[#666]">
            {loading
              ? "Loading from blockchain..."
              : `${certs.length} certificate${certs.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
        <button
          onClick={fetchCerts}
          disabled={loading}
          className="px-3 py-1.5 rounded border border-[#262626] text-xs text-[#666] hover:text-white hover:border-[#333] transition-colors disabled:opacity-40"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Empty state */}
      {!loading && certs.length === 0 && (
        <div className="empty-state-card">
          <p className="empty-state-title">
            No certificates found on-chain for this wallet.
          </p>
          <p className="empty-state-subtitle">
            Go to the "Issue" tab to create one.
          </p>
        </div>
      )}

      {/* Certificate cards */}
      <div className="cert-grid">
        {certs.map((cert) => (
          <div key={cert.hash} className="cert-card">
            <div className="cert-card-header">
              <div>
                <h3 className="cert-card-title">{cert.studentName}</h3>
                <p className="cert-card-course">{cert.courseName}</p>
                <p className="cert-card-issuer">Issued by: {cert.issuedBy}</p>
              </div>
              <div className="cert-card-date-box">
                <div className="cert-card-date-label">Date</div>
                <div className="cert-card-date-value">{cert.issuedDate}</div>
              </div>
            </div>

            <div className="mb-4">
              {/* Status */}
              <div className="flex items-center gap-2 mb-3">
                {cert.valid ? (
                  <span className="badge-active">Active</span>
                ) : (
                  <span className="badge-revoked">Revoked</span>
                )}
                <span className="badge-block">Block #{cert.blockNumber}</span>
              </div>

              {/* QR Code */}
              <div className="bg-white inline-block p-1.5 rounded">
                <QRCodeSVG value={cert.hash} size={64} level="M" />
              </div>
            </div>

            <div className="cert-card-footer">
              <p
                onClick={() => copyHash(cert.hash)}
                className="cert-card-hash"
                title="Click to copy hash"
              >
                {cert.hash}
              </p>

              <div className="cert-links-container">
                <a
                  href={`https://sepolia.etherscan.io/tx/${cert.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cert-link"
                >
                  View on Etherscan ↗
                </a>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/?tab=verify&hash=${cert.hash}`;
                    navigator.clipboard.writeText(url);
                    alert("Share link copied!");
                  }}
                  className="cert-share-link"
                >
                  Share Link ↗
                </button>
              </div>

              {/* Revoke */}
              {cert.valid && (
                <div className="revoke-container">
                  <button
                    onClick={() => handleRevoke(cert.hash)}
                    disabled={revoking === cert.hash}
                    className="btn-revoke w-full"
                  >
                    {revoking === cert.hash
                      ? "Revoking..."
                      : "Revoke Certificate"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
