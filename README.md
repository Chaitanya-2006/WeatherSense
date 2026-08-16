# WeatherSense 🌤

A premium real-time weather app with stunning, weather-reactive visuals — built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step.

**Created by Chaitanya Kokate**

🔗 **Live demo:** [your-vercel-url-here](#) <!-- replace with your actual Vercel deployment link -->

---

## Features

- 🌡️ **Real-time weather** — current conditions, hourly (8h) and daily (7-day) forecasts
- 🫁 **Air Quality Index** — PM2.5, PM10, NO₂, O₃, CO, SO₂ with color-coded status
- ☀️ **UV Index**, **Pressure gauge**, **Wind compass**, **Humidity**, **Visibility** widgets
- 🌅 **Sun & Moon** — animated sunrise/sunset arc, real-time moon phase
- 📈 **Temperature trend chart** — interactive canvas graph for the next few hours
- 🔍 **Smart search with autosuggest** — includes 100+ Maharashtra towns & villages not found on standard weather APIs
- 🎙️ **Voice search** — browser-based speech recognition
- ⭐ **Favorites sidebar** — save and jump between cities instantly
- 🕐 **Search history** — recent searches, one tap away
- 🌦️ **Dynamic weather-reactive backgrounds** — rain, snow, clouds, lightning, and a twinkling star canvas that responds to real conditions
- 🌡️ **°C / °F toggle**
- 📱 **Fully responsive** — mobile, tablet, and desktop

## Tech Stack

- HTML5, CSS3, vanilla JavaScript (ES6+)
- [OpenWeatherMap API](https://openweathermap.org/) — current weather, forecast, air pollution, geocoding
- Hosted on [Vercel](https://vercel.com/)

## Project Structure

```
weathersense/
├── api/
│   └── weather.js       # Vercel serverless function — proxies OpenWeatherMap, keeps API key server-side
├── index.html            # App markup
├── app.js                # All app logic (fetching, rendering, effects)
├── styles.css             # All styling and animations
├── images/                 # Weather background images
│   ├── sunny.png
│   ├── cloudy.png
│   ├── rainy.png
│   ├── snowy.png
│   ├── windy.png
│   └── default.png
├── .env.example
├── .gitignore
└── README.md
```

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/weathersense.git
   cd weathersense
   ```
2. Open `index.html` directly in a browser, or deploy the folder as-is to any static host (Vercel, Netlify, GitHub Pages).
3. No build step, no `npm install` — it's pure vanilla JS.

## API Key Security

The OpenWeatherMap API key is **not** exposed to the browser. All requests go through a Vercel serverless function (`/api/weather.js`) that reads the key from a server-side environment variable — the key never appears in the frontend code or dev tools network tab.

**Setup:**

1. Get a free API key at [home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys).
2. In your Vercel project → **Settings → Environment Variables**, add:
   - **Key:** `OWM_API_KEY`
   - **Value:** your actual key
   - **Environments:** Production and Preview (Development too, if you use `vercel dev`)
3. Redeploy for the variable to take effect.

**Local development:** copy `.env.example` to `.env`, fill in your key, and run with `vercel dev` (the plain `index.html` won't have the `/api` route without it).

## Data Source

Weather, forecast, air quality, and geocoding data powered by [OpenWeatherMap](https://openweathermap.org/).

## License

This project does not currently have a license. All rights are reserved by the author, and the code may not be copied, modified, or redistributed without permission. If you'd like to open-source it later, adding a license (e.g. MIT) is a one-file addition — happy to help with that whenever you're ready.
