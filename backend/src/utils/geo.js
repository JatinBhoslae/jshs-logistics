export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180

  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)

  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}

export function estimateEta({ from, to, speedKmph, now = new Date() }) {
  const distanceKm = haversineKm(from, to)
  const safeSpeed = typeof speedKmph === 'number' && speedKmph > 5 ? speedKmph : 35
  const hours = distanceKm / safeSpeed
  const ms = Math.round(hours * 60 * 60 * 1000)
  return new Date(now.getTime() + ms)
}
