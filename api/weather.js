// Vercel Serverless Function — proxies all OpenWeatherMap calls.
// The API key lives ONLY here (server-side), read from the OWM_API_KEY
// environment variable. It is never sent to the browser.
//
// Frontend calls this as: /api/weather?type=current&lat=..&lon=..&units=metric
//                          /api/weather?type=forecast&lat=..&lon=..&units=metric
//                          /api/weather?type=aqi&lat=..&lon=..
//                          /api/weather?type=geo&q=CityName

const BASE = 'https://api.openweathermap.org';

export default async function handler(req, res) {
  const API_KEY = process.env.OWM_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: OWM_API_KEY is not set in Vercel Environment Variables.' });
  }

  const { type, lat, lon, units = 'metric', q } = req.query;

  let url;
  switch (type) {
    case 'current':
      if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
      url = `${BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`;
      break;
    case 'forecast':
      if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
      url = `${BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${API_KEY}`;
      break;
    case 'aqi':
      if (!lat || !lon) return res.status(400).json({ error: 'lat and lon are required' });
      url = `${BASE}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
      break;
    case 'geo':
      if (!q) return res.status(400).json({ error: 'q (city name) is required' });
      url = `${BASE}/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${API_KEY}`;
      break;
    default:
      return res.status(400).json({ error: 'Invalid or missing type. Use current, forecast, aqi, or geo.' });
  }

  try {
    const r = await fetch(url);
    const data = await r.json();
    // Cache at the edge/CDN for 5 minutes to cut down on repeat OpenWeatherMap calls
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream weather service failed.' });
  }
}
