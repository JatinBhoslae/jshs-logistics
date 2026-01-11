import { env } from '../config/env.js'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'JSHS-Logistics-Platform/1.0'

/**
 * Autocomplete location suggestions using OpenStreetMap Nominatim
 */
export async function autocomplete(req, res) {
    const { input } = req.query

    if (!input) {
        return res.json({ predictions: [] })
    }

    try {
        console.log(`Fetching Nominatim search for: ${input}`);
        // Nominatim strict usage: limit to 5, providing email/user-agent if possible
        const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(input)}&format=json&addressdetails=1&limit=5`

        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept-Language': 'en-US,en;q=0.5'
            }
        })

        if (!response.ok) {
            console.error('Nominatim API Error:', response.status)
            return res.status(502).json({ error: { message: 'Location service unavailable' } })
        }

        const data = await response.json()

        // Transform Nominatim results to match Google Places prediction format
        const predictions = data.map(item => {
            const address = item.address || {}
            // Construct main text (Name of place or first relevant address part)
            const mainText = address.city || address.town || address.village || address.hamlet || address.suburb || item.name || input

            // Construct secondary text (Rest of the address)
            // Remove the main text part from display_name if possible, or just use display_name
            const secondaryText = item.display_name.replace(mainText, '').replace(/^,\s*/, '').trim()

            return {
                place_id: `${item.osm_type.charAt(0).toUpperCase()}${item.osm_id}`, // e.g., N12345, W67890
                description: item.display_name,
                structured_formatting: {
                    main_text: item.name || mainText,
                    secondary_text: secondaryText || item.display_name
                }
            }
        })

        console.log(`Nominatim success: ${predictions.length} results`);
        res.json({ predictions })

    } catch (error) {
        console.error('Nominatim Autocomplete Error:', error)
        res.status(500).json({ error: { message: 'Internal server error' } })
    }
}

/**
 * Get coordinates and details for a selected place using OSM ID
 */
export async function placeDetails(req, res) {
    const { placeId } = req.query

    if (!placeId) {
        return res.status(400).json({ error: { message: 'Place ID is required' } })
    }

    try {
        // Parse custom placeId (e.g., N12345 -> osm_type=N, osm_id=12345)
        const typeChar = placeId.charAt(0)
        const osmId = placeId.slice(1)

        if (!['N', 'W', 'R'].includes(typeChar) || isNaN(osmId)) {
            return res.status(400).json({ error: { message: 'Invalid Place ID format' } })
        }

        const url = `${NOMINATIM_BASE}/lookup?osm_ids=${typeChar}${osmId}&format=json&addressdetails=1`

        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT
            }
        })

        if (!response.ok) {
            console.error('Nominatim Details Error:', response.status)
            return res.status(502).json({ error: { message: 'Failed to fetch place details' } })
        }

        const data = await response.json()

        if (!data || data.length === 0) {
            return res.status(404).json({ error: { message: 'Place not found' } })
        }

        const result = data[0]

        res.json({
            name: result.name || result.display_name.split(',')[0],
            address: result.display_name,
            location: {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon)
            }
        })
    } catch (error) {
        console.error('Place Details Proxy Error:', error)
        res.status(500).json({ error: { message: 'Internal server error' } })
    }
}

/**
 * Reverse geocode coordinates to an address using OpenStreetMap Nominatim
 */
export async function reverseGeocode(req, res) {
    const { lat, lng } = req.query

    if (!lat || !lng) {
        return res.status(400).json({ error: { message: 'Latitude and Longitude are required' } })
    }

    try {
        const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`

        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT
            }
        })

        if (!response.ok) {
            console.error('Nominatim Reverse Error:', response.status)
            return res.status(502).json({ error: { message: 'Reverse geocoding failed' } })
        }

        const data = await response.json()

        if (!data || data.error) {
            return res.status(404).json({ error: { message: 'Location not found' } })
        }

        res.json({
            name: data.name || data.display_name.split(',')[0],
            address: data.display_name,
            location: {
                lat: parseFloat(data.lat),
                lng: parseFloat(data.lon)
            }
        })
    } catch (error) {
        console.error('Reverse Geocode Proxy Error:', error)
        res.status(500).json({ error: { message: 'Internal server error' } })
    }
}
