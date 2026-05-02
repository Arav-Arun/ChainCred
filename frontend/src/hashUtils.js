/**
 * SHA-256 hashing for certificate data
 * Combines all certificate fields into a single string,
 * then produces a hex-encoded SHA-256 hash.
 */

export async function generateCertificateHash({
  studentName,
  courseName,
  issuedDate,
  issuedBy,
}) {
  const s = studentName.trim();
  const c = courseName.trim();
  const d = issuedDate.trim();
  const i = issuedBy.trim();

  const raw = `${s}|${c}|${d}|${i}`;
  const encoded = new TextEncoder().encode(raw);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
