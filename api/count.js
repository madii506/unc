// Shared unc counter. Stores one number (sheets printed) and nothing else.
const NS = 'unc-coin-sheets', KEY = 'sheets', BASE = 'https://abacus.jasoncameron.dev';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const hit = req.method === 'POST';
  try {
    const r = await fetch(`${BASE}/${hit ? 'hit' : 'get'}/${NS}/${KEY}`, { signal: AbortSignal.timeout(4000) });
    if (r.status === 404 && !hit) return res.status(200).json({ ok: true, count: null });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const n = Number(j && j.value);
    return res.status(200).json({ ok: true, count: Number.isFinite(n) ? n : null });
  } catch (e) {
    return res.status(200).json({ ok: false, count: null });
  }
};
