export default async function handler(req, res) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENWEATHERMAP_API_KEY environment variable is missing" });
  }

  const { type, lat, lon, units, q } = req.query;

  if (!type) {
    return res.status(400).json({ error: "Missing 'type' query parameter" });
  }

  const BASE = 'https://api.openweathermap.org';
  let url = '';

  switch (type) {
    case 'current':
      if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon for current weather" });
      url = `${BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units || 'metric'}&appid=${apiKey}`;
      break;
    case 'forecast':
      if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon for forecast" });
      url = `${BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units || 'metric'}&appid=${apiKey}`;
      break;
    case 'aqi':
      if (!lat || !lon) return res.status(400).json({ error: "Missing lat/lon for aqi" });
      url = `${BASE}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
      break;
    case 'geo':
      if (!q) return res.status(400).json({ error: "Missing 'q' for geo" });
      url = `${BASE}/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`;
      break;
    default:
      return res.status(400).json({ error: "Invalid type parameter" });
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Add CDN caching to reduce upstream calls
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch data from OpenWeatherMap" });
  }
}
