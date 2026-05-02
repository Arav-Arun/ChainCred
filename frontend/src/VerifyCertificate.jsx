/**
 * Two modes:
 *   1. Enter certificate details → compute hash → check on-chain
 *   2. Paste a hash directly → check on-chain
 * No wallet needed - uses a public RPC for read-only calls.
 */

import { useState, useEffect } from "react";
import {
  verifyCertificateOnChain,
  getCertificateDetailsByHash,
} from "./blockchain";
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

export default function VerifyCertificate() {
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("hash") ? "hash" : "details";
  });
  const [form, setForm] = useState({
    studentName: "",
    courseName: "",
    issuedDate: "",
    issuedBy: "",
  });
  const [directHash, setDirectHash] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("hash") || "";
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParam = params.get("hash");
    if (hashParam) {
      // Auto verify if hash is present
      verifyHashDirectly(hashParam);
    }
  }, []);

  const verifyHashDirectly = async (hash) => {
    setLoading(true);
    setResult(null);
    try {
      const isValid = await verifyCertificateOnChain(hash);
      let details = null;
      if (isValid) {
        details = await getCertificateDetailsByHash(hash);
      }
      setResult({ valid: isValid, hash, details });
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleVerify = async (e) => {
    e.preventDefault();
    if (mode === "details") {
      const hash = await generateCertificateHash(form);
      verifyHashDirectly(hash);
    } else {
      const hash = directHash.trim();
      if (!hash) {
        setResult({ error: "Please enter a hash" });
        return;
      }
      verifyHashDirectly(hash);
    }
  };

  const reset = () => {
    setForm({ studentName: "", courseName: "", issuedDate: "", issuedBy: "" });
    setDirectHash("");
    setResult(null);
  };

  return (
    <div>
      <h1 className="page-header">Verify Certificate</h1>
      <p className="page-description">
        Check if a certificate is valid on the blockchain. No wallet needed.
      </p>

      {/* Mode toggle */}
      <div className="tab-switcher">
        <button
          onClick={() => {
            setMode("details");
            reset();
          }}
          className={`tab-btn ${mode === "details" ? "tab-btn-active" : "tab-btn-inactive"}`}
        >
          Enter Details
        </button>
        <button
          onClick={() => {
            setMode("hash");
            reset();
          }}
          className={`tab-btn ${mode === "hash" ? "tab-btn-active" : "tab-btn-inactive"}`}
        >
          Paste Hash
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleVerify} className="form-card">
        {mode === "details" ? (
          FIELDS.map((f) => (
            <div key={f.name}>
              <label className="form-label">{f.label}</label>
              <input
                type={f.type}
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                required
                disabled={loading}
                className="form-input"
              />
            </div>
          ))
        ) : (
          <div>
            <label className="form-label">Certificate Hash</label>
            <input
              type="text"
              value={directHash}
              onChange={(e) => setDirectHash(e.target.value)}
              placeholder="e.g. a1b2c3d4e5f6..."
              required
              disabled={loading}
              className="form-input font-mono"
            />
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Checking..." : "Verify on Blockchain"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="mt-5">
          {result.error ? (
            <div className="result-card-error">
              <p className="text-sm text-red-400">{result.error}</p>
            </div>
          ) : result.valid ? (
            <div className="result-card-success">
              <p className="text-sm font-semibold text-green-400 mb-1">
                ✓ Valid Certificate
              </p>
              <p className="text-xs text-[#666] mb-3">
                This hash exists on the blockchain and has not been revoked.
              </p>

              {result.details && (
                <div className="mb-3 space-y-1.5 border-l-2 border-green-500/30 pl-3">
                  <p className="text-sm text-white">
                    <span className="text-[#888] text-xs uppercase mr-2">
                      Student:
                    </span>{" "}
                    {result.details.studentName}
                  </p>
                  <p className="text-sm text-white">
                    <span className="text-[#888] text-xs uppercase mr-2">
                      Degree:
                    </span>{" "}
                    {result.details.courseName}
                  </p>
                  <p className="text-sm text-white">
                    <span className="text-[#888] text-xs uppercase mr-2">
                      Issued By:
                    </span>{" "}
                    {result.details.issuedBy}
                  </p>
                  <p className="text-sm text-white">
                    <span className="text-[#888] text-xs uppercase mr-2">
                      Date:
                    </span>{" "}
                    {result.details.issuedDate}
                  </p>
                  <p
                    className="text-xs text-[#555] truncate mt-1"
                    title={result.details.issuer}
                  >
                    Issuer Address: {result.details.issuer}
                  </p>
                </div>
              )}

              <p className="text-[10px] font-mono text-[#555] break-all">
                {result.hash}
              </p>
            </div>
          ) : (
            <div className="result-card-invalid">
              <p className="text-sm font-semibold text-yellow-400 mb-1">
                ✗ Not Found
              </p>
              <p className="text-xs text-[#666] mb-2">
                No matching certificate on the blockchain.
              </p>
              <p className="text-xs font-mono text-[#888] break-all">
                {result.hash}
              </p>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full mt-3 py-2 rounded border border-[#262626] text-xs text-[#666] hover:text-white hover:border-[#333] transition-colors"
          >
            Check Another
          </button>
        </div>
      )}
    </div>
  );
}
