export function formatScore(score) {
  const n = Number(score ?? 0)
  if (Number.isNaN(n)) return '0'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
