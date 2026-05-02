/**
 * Flow:
 *   1. User fills in certificate details (name, course, date, issuer)
 *   2. SHA-256 hash is computed client-side
 *   3. Hash is stored on Ethereum via the connected wallet
 *   4. Success screen shows hash, QR code, and Etherscan link
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { QRCodeSVG } from "qrcode.react";
import { storeCertificateOnChain } from "./blockchain";
import { generateCertificateHash } from "./hashUtils";

const FIELDS = [
  {
    name: "studentName",
    label: "Student Name",
    type: "text",
    placeholder: "John Doe",
  },
  {
    name: "courseName",
    label: "Course / Degree",
    type: "text",
    placeholder: "B.Tech Computer Science",
  },
  { name: "issuedDate", label: "Issue Date", type: "date" },
  {
    name: "issuedBy",
    label: "Issuing Authority",
    type: "text",
    placeholder: "MIT University",
  },
];

const EMPTY_FORM = {
  studentName: "",
  courseName: "",
  issuedDate: "",
  issuedBy: "",
};

export default function IssueCertificate() {
  const { isConnected } = useAccount();
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("idle"); // idle | storing | done | error
  const [hash, setHash] = useState("");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("storing");
    setError("");

    try {
      const certHash = await generateCertificateHash(form);
      setHash(certHash);

      const tx = await storeCertificateOnChain(
        certHash,
        form.studentName.trim(),
        form.courseName.trim(),
        form.issuedDate.trim(),
        form.issuedBy.trim(),
      );
      setTxHash(tx);

      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setStatus("idle");
    setHash("");
    setTxHash("");
    setError("");
  };

  // Wallet not connected
  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <h1 className="page-header">Issue Certificate</h1>
        <p className="page-description">
          Connect your wallet to issue a certificate on-chain.
        </p>
      </div>
    );
  }

  // Success - show full certificate details
  if (status === "done") {
    const details = [
      { label: "Student Name", value: form.studentName },
      { label: "Course / Degree", value: form.courseName },
      { label: "Issue Date", value: form.issuedDate },
      { label: "Issuing Authority", value: form.issuedBy },
    ];

    return (
      <div>
        <h1 className="page-header-success">Certificate Issued ✓</h1>

        <div className="form-card">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={hash} size={120} level="M" />
            </div>
          </div>

          {/* Certificate details */}
          <div className="grid grid-cols-2 gap-3">
            {details.map(({ label, value }) => (
              <div key={label} className="detail-card">
                <p className="detail-label">{label}</p>
                <p className="detail-value">{value}</p>
              </div>
            ))}
          </div>

          {/* Hash */}
          <div className="detail-card">
            <p className="detail-label">Certificate Hash</p>
            <p
              className="detail-hash"
              onClick={() => navigator.clipboard.writeText(hash)}
              title="Click to copy"
            >
              {hash}
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-3">
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="link-btn-secondary"
              >
                View on Etherscan ↗
              </a>
            )}
            <button
              onClick={() => {
                const url = `${window.location.origin}/?tab=verify&hash=${hash}`;
                navigator.clipboard.writeText(url);
                alert("Share link copied!");
              }}
              className="link-btn-primary"
            >
              Copy Share Link ↗
            </button>
          </div>

          <button
            onClick={reset}
            className="w-full py-2.5 rounded border border-[#262626] text-sm text-[#888] hover:text-white transition-colors"
          >
            Issue Another
          </button>
        </div>
      </div>
    );
  }

  // Error
  if (status === "error") {
    return (
      <div>
        <h1 className="page-header">Issue Certificate</h1>
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded border border-[#262626] text-sm text-[#888] hover:text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Form
  return (
    <div>
      <h1 className="page-header">Issue Certificate</h1>
      <p className="page-description">
        Fill in the details. You'll confirm a transaction in your wallet.
      </p>

      <form onSubmit={handleSubmit} className="form-card">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="form-label">{f.label}</label>
            <input
              type={f.type}
              name={f.name}
              value={form[f.name]}
              onChange={handleChange}
              placeholder={f.placeholder}
              required
              disabled={status === "storing"}
              className="form-input"
            />
          </div>
        ))}

        {status === "storing" && (
          <p className="text-xs text-[#666]">
            Confirm the transaction in your wallet...
          </p>
        )}

        <button
          type="submit"
          disabled={status === "storing"}
          className="btn-primary w-full"
        >
          {status === "storing" ? "Waiting for wallet..." : "Issue Certificate"}
        </button>
      </form>
    </div>
  );
}
