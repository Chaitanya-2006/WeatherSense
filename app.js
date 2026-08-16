// API key and BASE url have been moved server-side to /api/weather.js for security.
let units = 'metric';
let currentLat, currentLon, currentCity;
let favorites = JSON.parse(localStorage.getItem('favs') || '[]');
let history = JSON.parse(localStorage.getItem('hist') || '[]');
let usingFallbackLocation = false;
let loadRequestId = 0;
let lastW = null, lastF = null, lastA = null;

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function locationKey(name, lat, lon) {
    return `${name.toLowerCase()}|${parseFloat(lat).toFixed(2)}|${parseFloat(lon).toFixed(2)}`;
}
// Weather background images
const weatherBGs = {
    sunny: 'images/sunny.png',
    cloudy: 'images/cloudy.png',
    rainy: 'images/rainy.png',
    windy: 'images/windy.png',
    snowy: 'images/snowy.png',
    default: 'images/default.png'
};

// ===== MAHARASHTRA CUSTOM LOCATIONS =====
// Small towns, villages, and renamed cities that OpenWeatherMap may not find
const customLocations = {
    // Renamed cities
    'chhatrapati sambhaji nagar': { lat: 19.8762, lon: 75.3433, name: 'Chhatrapati Sambhaji Nagar' },
    'sambhaji nagar': { lat: 19.8762, lon: 75.3433, name: 'Chhatrapati Sambhaji Nagar' },
    'chhatrapati sambhajinagar': { lat: 19.8762, lon: 75.3433, name: 'Chhatrapati Sambhaji Nagar' },
    'ahilyanagar': { lat: 19.0948, lon: 74.7480, name: 'Ahilyanagar' },
    'ahmednagar': { lat: 19.0948, lon: 74.7480, name: 'Ahilyanagar' },
    'dharashiv': { lat: 18.1860, lon: 76.0420, name: 'Dharashiv' },
    'osmanabad': { lat: 18.1860, lon: 76.0420, name: 'Dharashiv' },


    // Major Maharashtra cities
    'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
    'pune': { lat: 18.5204, lon: 73.8567, name: 'Pune' },
    'nagpur': { lat: 21.1458, lon: 79.0882, name: 'Nagpur' },
    'nashik': { lat: 19.9975, lon: 73.7898, name: 'Nashik' },
    'thane': { lat: 19.2183, lon: 72.9781, name: 'Thane' },
    'kolhapur': { lat: 16.7050, lon: 74.2433, name: 'Kolhapur' },
    'solapur': { lat: 17.6599, lon: 75.9064, name: 'Solapur' },
    'satara': { lat: 17.6805, lon: 74.0183, name: 'Satara' },
    'sangli': { lat: 16.8524, lon: 74.5815, name: 'Sangli' },
    'jalgaon': { lat: 21.0077, lon: 75.5626, name: 'Jalgaon' },
    'dhule': { lat: 20.9042, lon: 74.7749, name: 'Dhule' },
    'jalna': { lat: 19.8347, lon: 75.8816, name: 'Jalna' },
    'beed': { lat: 18.9891, lon: 75.7600, name: 'Beed' },
    'latur': { lat: 18.3963, lon: 76.5726, name: 'Latur' },
    'nanded': { lat: 19.1383, lon: 77.3210, name: 'Nanded' },
    'parbhani': { lat: 19.2610, lon: 76.7700, name: 'Parbhani' },
    'hingoli': { lat: 19.7173, lon: 77.1483, name: 'Hingoli' },
    'akola': { lat: 20.7002, lon: 77.0082, name: 'Akola' },
    'washim': { lat: 20.1007, lon: 77.1303, name: 'Washim' },
    'buldhana': { lat: 20.5293, lon: 76.1845, name: 'Buldhana' },
    'amravati': { lat: 20.9320, lon: 77.7523, name: 'Amravati' },
    'yavatmal': { lat: 20.3888, lon: 78.1204, name: 'Yavatmal' },
    'wardha': { lat: 20.7453, lon: 78.5986, name: 'Wardha' },
    'chandrapur': { lat: 19.9615, lon: 79.2961, name: 'Chandrapur' },
    'gadchiroli': { lat: 20.1809, lon: 80.0012, name: 'Gadchiroli' },
    'gondia': { lat: 21.4602, lon: 80.1928, name: 'Gondia' },
    'bhandara': { lat: 21.1669, lon: 79.6508, name: 'Bhandara' },
    'raigad': { lat: 18.5158, lon: 73.1822, name: 'Raigad' },
    'ratnagiri': { lat: 16.9902, lon: 73.3120, name: 'Ratnagiri' },
    'sindhudurg': { lat: 16.3489, lon: 73.7556, name: 'Sindhudurg' },
    'nandurbar': { lat: 21.3720, lon: 74.2390, name: 'Nandurbar' },
    'palghar': { lat: 19.6968, lon: 72.7651, name: 'Palghar' },
};

// ===== DOM =====
const $ = id => document.getElementById(id);

// ===== API =====
async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || r.statusText);
    }
    return r.json();
}
const apiWeather = (lat, lon) => fetchJSON(`/api/weather?type=current&lat=${lat}&lon=${lon}&units=metric`);
const apiForecast = (lat, lon) => fetchJSON(`/api/weather?type=forecast&lat=${lat}&lon=${lon}&units=metric`);
const apiAQI = (lat, lon) => fetchJSON(`/api/weather?type=aqi&lat=${lat}&lon=${lon}`);
const apiGeo = (city) => fetchJSON(`/api/weather?type=geo&q=${encodeURIComponent(city)}`);
const iconUrl = (c, s = 2) => `https://openweathermap.org/img/wn/${c}@${s}x.png`;

// ===== UTILS =====
function fmtTime(ts, tz) {
    return new Date((ts + tz) * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
}
function fmtHour(ts, tz) {
    return new Date((ts + tz) * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' });
}
function fmtDay(ts, tz) {
    const d = new Date((ts + tz) * 1000);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return { day: days[d.getUTCDay()], date: `${d.getUTCMonth() + 1}/${d.getUTCDate()}` };
}
function windDir(deg) {
    const d = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return d[Math.round(deg / 22.5) % 16];
}
function aqiInfo(v) {
    const m = [{ l: 'Good', f: '😊', c: '#22c55e' }, { l: 'Fair', f: '🙂', c: '#eab308' }, { l: 'Moderate', f: '😐', c: '#f97316' }, { l: 'Poor', f: '😷', c: '#ef4444' }, { l: 'Very Poor', f: '🤢', c: '#7c3aed' }];
    return m[Math.min(v - 1, 4)] || m[0];
}
function uvInfo(v) {
    if (v <= 2) return { l: 'Low', c: '#22c55e', a: 'No protection needed' };
    if (v <= 5) return { l: 'Moderate', c: '#eab308', a: 'Wear sunscreen after 10 AM' };
    if (v <= 7) return { l: 'High', c: '#f97316', a: 'Reduce sun exposure 10AM-4PM' };
    if (v <= 10) return { l: 'Very High', c: '#ef4444', a: 'Avoid sun exposure' };
    return { l: 'Extreme', c: '#7c3aed', a: 'Stay indoors if possible' };
}
function moonPhase() {
    const d = new Date(), jd = Math.floor(365.25 * (d.getFullYear() + 4716)) + Math.floor(30.6001 * (d.getMonth() + 1 + 1)) + d.getDate() - 1524.5;
    let p = ((jd - 2451550.1) / 29.530588853) % 1; if (p < 0) p += 1;
    const icons = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    const i = Math.floor(p * 8) % 8;
    return { icon: icons[i], name: names[i] };
}
function cToF(c) { return c * 9/5 + 32; }
function kmhToMph(kmh) { return kmh / 1.609; }

// ===== BACKGROUND ANIMATION =====
function initBg() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;
    const c = $('weather-bg-canvas'), ctx = c.getContext('2d');
    let stars = [], w, h, animFrameId, resizeTimer;
    let isVisible = !document.hidden;
    function resizeNow() {
        w = c.width = innerWidth; h = c.height = innerHeight;
        stars = Array.from({ length: 150 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.3, a: Math.random(), da: (Math.random() - 0.5) * 0.012 }));
    }
    function resize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeNow, 150);
    }
    function draw() {
        if (!isVisible) return;
        ctx.clearRect(0, 0, w, h);
        stars.forEach(s => { s.a += s.da; if (s.a > 1 || s.a < 0.1) s.da *= -1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(200,210,255,${s.a})`; ctx.fill(); });
        animFrameId = requestAnimationFrame(draw);
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isVisible = false;
            if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
        } else {
            isVisible = true;
            draw();
        }
    });
    addEventListener('resize', resize); resizeNow(); draw();
}

function setWeatherFx(cond, windSpeed) {
    const condition = cond.toLowerCase();

    // Skip rebuild if weather condition hasn't changed (avoids jank on unit toggle/refetch)
    if (condition === lastWeatherCondition) return;
    lastWeatherCondition = condition;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Remove old effects
    document.querySelectorAll('.rain-drop,.cloud-layer,.lightning-flash').forEach(e => e.remove());
    if (lightningInterval) { clearInterval(lightningInterval); lightningInterval = null; }

    const bgEl = document.getElementById('weather-bg-image');

    if (condition === 'clear') {
        bgEl.style.backgroundImage = `url('${weatherBGs.sunny}')`;
    } else if (condition === 'clouds') {
        bgEl.style.backgroundImage = `url('${weatherBGs.cloudy}')`;
        if (!prefersReducedMotion) mkClouds();
    } else if (condition === 'rain' || condition === 'drizzle') {
        bgEl.style.backgroundImage = `url('${weatherBGs.rainy}')`;
        if (!prefersReducedMotion) mkRain();
    } else if (condition === 'thunderstorm') {
        bgEl.style.backgroundImage = `url('${weatherBGs.rainy}')`;
        if (!prefersReducedMotion) { mkRain(); startLightning(); }
    } else if (condition === 'snow') {
        bgEl.style.backgroundImage = `url('${weatherBGs.snowy}')`;
        if (!prefersReducedMotion) mkSnow();
    } else if (condition === 'mist' || condition === 'smoke' || condition === 'haze' ||
        condition === 'dust' || condition === 'fog' || condition === 'sand' || condition === 'ash') {
        bgEl.style.backgroundImage = `url('${weatherBGs.cloudy}')`;
        if (!prefersReducedMotion) mkClouds();
    } else if (condition === 'squall' || condition === 'tornado') {
        bgEl.style.backgroundImage = `url('${weatherBGs.windy}')`;
    } else if (windSpeed && windSpeed > 10) {
        bgEl.style.backgroundImage = `url('${weatherBGs.windy}')`;
    } else {
        bgEl.style.backgroundImage = `url('${weatherBGs.sunny}')`;
    }
}

let lightningInterval = null;
let lastWeatherCondition = null;
function startLightning() {
    if (lightningInterval) clearInterval(lightningInterval);
    lightningInterval = setInterval(() => {
        if (Math.random() > 0.7) {
            const f = document.createElement('div');
            f.className = 'lightning-flash';
            document.body.appendChild(f);
            setTimeout(() => f.remove(), 200);
        }
    }, 3000);
}
function mkRain() { for (let i = 0; i < 50; i++) { const d = document.createElement('div'); d.className = 'rain-drop'; d.style.cssText = `left:${Math.random() * 100}%;height:${Math.random() * 18 + 8}px;animation-duration:${Math.random() * 0.4 + 0.3}s;animation-delay:${Math.random() * 2}s;opacity:${Math.random() * 0.3 + 0.1}`; document.body.appendChild(d); } }
function mkSnow() { for (let i = 0; i < 40; i++) { const d = document.createElement('div'); d.className = 'rain-drop'; d.style.cssText = `left:${Math.random() * 100}%;width:${Math.random() * 5 + 3}px;height:${Math.random() * 5 + 3}px;border-radius:50%;background:rgba(255,255,255,0.6);animation-duration:${Math.random() * 2 + 2}s;animation-delay:${Math.random() * 3}s`; document.body.appendChild(d); } }
function mkClouds() { for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.className = 'cloud-layer'; d.style.cssText = `top:${Math.random() * 30}%;animation-duration:${Math.random() * 25 + 35}s;animation-delay:${Math.random() * 15}s;width:${Math.random() * 200 + 200}px`; document.body.appendChild(d); } }

// ===== RENDER =====
function renderWeather(w, forecast, aqi) {
    const tz = w.timezone;
    const displayName = customCityName || currentCity || w.name;
    $('city-name').textContent = displayName;
    if ($('inline-location-btn')) {
        if (!usingFallbackLocation) {
            $('inline-location-btn').classList.add('hidden');
        }
        $('inline-location-btn').querySelector('.inline-loc-text').textContent = 'Turn on location';
    }
    currentCity = displayName;
    document.title = `${displayName} — WeatherSense Weather`;
    customCityName = null; // Reset after use

    // Main card
    const formatTemp = t => units === 'metric' ? Math.round(t) : Math.round(cToF(t));
    $('current-temp-value').textContent = formatTemp(w.main.temp);
    $('realfeel-temp').textContent = formatTemp(w.main.feels_like);
    $('temp-unit-label').textContent = units === 'metric' ? 'C' : 'F';
    $('weather-condition').textContent = w.weather[0].main;
    $('low-temp').textContent = formatTemp(w.main.temp_min);
    $('high-temp').textContent = formatTemp(w.main.temp_max);
    $('wind-dir').textContent = (w.wind.deg != null) ? windDir(w.wind.deg) : 'Calm';
    const windSpeedKmh = w.wind.speed * 3.6;
    const spd = units === 'metric' ? windSpeedKmh.toFixed(1) + 'km/h' : kmhToMph(windSpeedKmh).toFixed(1) + 'mph';
    $('wind-speed').textContent = spd;
    $('humidity-main').textContent = w.main.humidity;
    $('weather-icon-main').innerHTML = `<img src="${iconUrl(w.weather[0].icon, 4)}" alt="${escapeHtml(w.weather[0].description)}">`;

    // Precipitation message
    const pop = forecast.list[0]?.pop || 0;
    $('precipitation-msg').textContent = pop < 0.1 ? 'No precipitation for at least 120 min' : `${Math.round(pop * 100)}% chance of precipitation`;

    // Weather effects with wind speed
    setWeatherFx(w.weather[0].main, w.wind.speed);

    // Hourly
    const hrs = forecast.list.slice(0, 8);
    $('hourly-scroll').innerHTML = hrs.map((h, i) => {
        const t = fmtHour(h.dt, tz);
        return `<div class="hourly-item${i === 0 ? ' now' : ''}"><div class="hourly-time">${i === 0 ? 'Now' : t}</div><div class="hourly-icon"><img src="${iconUrl(h.weather[0].icon)}" alt=""></div><div class="hourly-temp">${formatTemp(h.main.temp)}°</div></div>`;
    }).join('');

    // Daily - group forecast by day
    const dayMap = {};
    forecast.list.forEach(item => {
        const d = fmtDay(item.dt, tz);
        const key = d.date;
        if (!dayMap[key]) dayMap[key] = { ...d, temps: [], icons: [], conditions: [], pops: [] };
        dayMap[key].temps.push(item.main.temp);
        dayMap[key].icons.push(item.weather[0].icon);
        dayMap[key].conditions.push(item.weather[0].description);
        dayMap[key].pops.push(item.pop || 0);
    });
    const days = Object.values(dayMap).slice(0, 7);
    $('daily-summary').textContent = days.length > 0 ? `Forecast for the next ${days.length} days` : '';
    $('daily-list').innerHTML = days.map((d, i) => {
        const hi = formatTemp(Math.max(...d.temps));
        const lo = formatTemp(Math.min(...d.temps));
        const pop = Math.round(Math.max(...d.pops) * 100);
        const midIcon = d.icons[Math.floor(d.icons.length / 2)];
        const cond = d.conditions[Math.floor(d.conditions.length / 2)];
        return `<div class="daily-item"><div class="daily-date"><span>${d.date}</span><strong>${i === 0 ? 'Today' : d.day}</strong></div><div class="daily-precip">${pop > 0 ? pop + '%' : ''}</div><div class="daily-icon"><img src="${iconUrl(midIcon)}" alt=""></div><div class="daily-condition">${escapeHtml(cond)}</div><div class="daily-temps"><span class="daily-hi">${hi}°</span>/<span class="daily-lo">${lo}°</span></div></div>`;
    }).join('');

    // AQI
    try {
    if (aqi?.list?.[0]) {
        const a = aqi.list[0];
        const info = aqiInfo(a.main.aqi);
        $('aqi-face').textContent = info.f;
        $('aqi-number').textContent = Math.round(a.components.pm2_5);
        $('aqi-label').textContent = info.l;
        $('aqi-label').style.color = info.c;
        $('aqi-pollutant').textContent = 'Main Pollutant: Particulate Matter 2.5';
        $('aqi-marker').style.left = Math.min(a.main.aqi / 5 * 100, 100) + '%';
        const comps = [['NO₂', a.components.no2], ['O₃', a.components.o3], ['PM10', a.components.pm10], ['PM2.5', a.components.pm2_5], ['CO', Math.round(a.components.co / 100)], ['SO₂', a.components.so2]];
        $('aqi-components').innerHTML = comps.map(([l, v]) => `<div class="aqi-comp-item"><div class="aqi-comp-label">${l}</div><div class="aqi-comp-value">${Math.round(v)}</div></div>`).join('');
    } else {
        $('aqi-label').textContent = 'Unavailable';
        $('aqi-number').textContent = '--';
        $('aqi-face').textContent = '❓';
    }
    } catch (e) { console.warn('AQI render error:', e); }

    // Pressure gauge
    try {
    $('pressure-value').textContent = w.main.pressure;
    const pNorm = Math.max(0, Math.min(1, (w.main.pressure - 960) / 80));
    const arcLen = pNorm * 251;
    $('pressure-arc').setAttribute('stroke-dasharray', `${arcLen} 251`);
    } catch (e) { console.warn('Pressure render error:', e); }

    // Wind compass
    try {
    $('wind-speed-compass').textContent = (w.wind.speed * 3.6).toFixed(1);
    $('wind-needle').setAttribute('transform', `rotate(${w.wind.deg || 0}, 100, 100)`);
    } catch (e) { console.warn('Wind compass render error:', e); }

    // UV (estimate from weather)
    try {
    const uvEst = w.clouds.all < 20 ? 6 : w.clouds.all < 50 ? 4 : w.clouds.all < 80 ? 2 : 1;
    const now = new Date();
    const hour = now.getHours();
    const uvVal = (hour >= 6 && hour <= 18) ? uvEst : 0;
    const uv = uvInfo(uvVal);
    $('uv-value').textContent = uvVal;
    $('uv-label').textContent = uv.l;
    $('uv-label').style.color = uv.c;
    $('uv-advice').textContent = uv.a;
    $('uv-marker').style.left = Math.min(uvVal / 11 * 100, 100) + '%';
    } catch (e) { console.warn('UV render error:', e); }

    // Visibility
    const visKm = w.visibility != null ? (w.visibility / 1000).toFixed(1) : '—';
    $('visibility-value').textContent = visKm;
    $('visibility-desc').textContent = w.visibility == null
        ? 'Visibility data unavailable'
        : w.visibility >= 10000 ? 'Good visibility and clear field of vision'
        : w.visibility >= 5000 ? 'Moderate visibility' : 'Low visibility';

    // Precip & Humidity
    const rain = w.rain ? (w.rain['1h'] || w.rain['3h'] || 0) : 0;
    $('precip-value').textContent = rain > 0 ? rain.toFixed(1) + ' mm' : '0 cm';
    $('precip-desc').textContent = rain > 0 ? 'Precipitation detected' : 'No precipitation expected for the next few days.';
    $('humidity-value').textContent = w.main.humidity + '%';
    const dewpoint = Math.round(w.main.temp - ((100 - w.main.humidity) / 5));
    $('dewpoint-info').textContent = `The dew point is ${formatTemp(dewpoint)}°`;
    $('humidity-desc').textContent = w.main.humidity < 30 ? 'Air is dry. Stay hydrated.' : w.main.humidity < 60 ? 'Comfortable humidity.' : 'Feels humid and sticky.';

    // Sun & Moon
    try {
    $('sunrise-label').textContent = fmtTime(w.sys.sunrise, tz);
    $('sunset-label').textContent = fmtTime(w.sys.sunset, tz);
    const daylight = w.sys.sunset - w.sys.sunrise;
    const dlH = Math.floor(daylight / 3600);
    const dlM = Math.floor((daylight % 3600) / 60);
    $('daylight-label').textContent = `${dlH}h ${dlM}min`;

    // Sun position on arc
    const nowTs = Math.floor(Date.now() / 1000);
    let sunProgress = (nowTs - w.sys.sunrise) / (w.sys.sunset - w.sys.sunrise);
    sunProgress = Math.max(0, Math.min(1, sunProgress));
    const sx = 30 + sunProgress * 340;
    const sy = 170 - Math.sin(sunProgress * Math.PI) * 160;
    $('sun-position').setAttribute('cx', sx);
    $('sun-position').setAttribute('cy', sy);
    if ($('sun-glow')) { $('sun-glow').setAttribute('cx', sx); $('sun-glow').setAttribute('cy', sy); }

    const mp = moonPhase();
    $('moon-icon').textContent = mp.icon;
    $('moon-phase').textContent = mp.name;
    $('moon-times').textContent = `Daylight: ${dlH}h ${dlM}min`;
    } catch (e) { console.warn('Sun/Moon render error:', e); }

    // Chart
    renderChart(forecast, tz);
}

// ===== CHART =====
function renderChart(forecast, tz) {
    const canvas = $('temp-chart');
    const rect = canvas.getBoundingClientRect();
    // Retry on next frame if canvas is not yet visible/laid out (e.g. during loading→app transition)
    if (rect.width === 0) {
        requestAnimationFrame(() => renderChart(forecast, tz));
        return;
    }
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = 180;

    const data = forecast.list.slice(0, 8).map(h => {
        const t = units === 'metric' ? h.main.temp : cToF(h.main.temp);
        return {
            temp: Math.round(t),
            label: fmtHour(h.dt, tz)
        };
    });
    const temps = data.map(d => d.temp);
    const minT = Math.min(...temps) - 2, maxT = Math.max(...temps) + 2;
    const padX = 30, padY = 25;
    const gW = W - padX * 2, gH = H - padY * 2;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        const y = padY + (gH / 3) * i;
        ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - padX, y); ctx.stroke();
    }

    // Line
    const pts = data.map((d, i) => ({
        x: padX + (gW / (data.length - 1)) * i,
        y: padY + gH - ((d.temp - minT) / (maxT - minT)) * gH
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padY, 0, H - padY);
    grad.addColorStop(0, 'rgba(96,165,250,0.3)');
    grad.addColorStop(1, 'rgba(96,165,250,0)');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, H - padY);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H - padY);
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
        const xc = (pts[i - 1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(xc, pts[i - 1].y, xc, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots & labels
    ctx.fillStyle = '#fff';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#60a5fa';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(data[i].temp + '°', p.x, p.y - 10);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(data[i].label, p.x, H - 5);
    });
}

// ===== MAIN FETCH =====
async function loadWeather(lat, lon) {
    const requestId = ++loadRequestId;
    showLoading();
    hideError();
    try {
        const [w, f, a] = await Promise.all([apiWeather(lat, lon), apiForecast(lat, lon), apiAQI(lat, lon)]);
        if (requestId !== loadRequestId) return;
        lastW = w; lastF = f; lastA = a;
        currentLat = lat;
        currentLon = lon;
        renderWeather(w, f, a);
        showApp();
    } catch (e) {
        if (requestId !== loadRequestId) return;
        console.error(e);
        showError('Weather Error', 'Could not fetch weather data. Please try again.');
    }
}

let customCityName = null; // Override name for custom locations

async function searchCity(name) {
    showLoading();
    hideError();
    try {
        const searchKey = name.toLowerCase().trim();

        // Check custom locations database first (for Maharashtra villages & renamed cities)
        if (customLocations[searchKey]) {
            const loc = customLocations[searchKey];
            customCityName = loc.name; // Override the displayed name
            addHistory(loc.name, loc.lat, loc.lon);
            await loadWeather(loc.lat, loc.lon);
            return;
        }

        // Try OpenWeatherMap geocoding API
        const geo = await apiGeo(name);
        if (!geo.length) {
            // Try partial match in custom locations as fallback
            const partialMatch = Object.keys(customLocations).find(key =>
                key.includes(searchKey) || searchKey.includes(key)
            );
            if (partialMatch) {
                const loc = customLocations[partialMatch];
                customCityName = loc.name;
                addHistory(loc.name, loc.lat, loc.lon);
                await loadWeather(loc.lat, loc.lon);
                return;
            }
            showError('City Not Found', `"${name}" was not found. Check spelling and try again.`);
            return;
        }
        if (geo.length > 1) {
            showCityPicker(geo);
            return;
        }
        customCityName = null; // Use API name
        currentCity = null; // Reset so renderWeather uses API name
        addHistory(name, geo[0].lat, geo[0].lon);
        await loadWeather(geo[0].lat, geo[0].lon);
    } catch (e) {
        showError('Search Error', 'Something went wrong. Please try again.');
    }
}

function showCityPicker(geo) {
    const sugBox = $('search-suggestions');
    const unique = [];
    const seen = new Set();
    geo.forEach(r => {
        const key = locationKey(r.name, r.lat, r.lon);
        if (!seen.has(key)) { seen.add(key); unique.push(r); }
    });
    sugBox.innerHTML = unique.map(loc => {
        const label = `${escapeHtml(loc.name)}${loc.state ? ', ' + escapeHtml(loc.state) : ''}, ${escapeHtml(loc.country)}`;
        return `<div class="suggestion-item" data-lat="${loc.lat}" data-lon="${loc.lon}" data-name="${escapeHtml(loc.name)}">📍 ${label}</div>`;
    }).join('');
    sugBox.classList.remove('hidden');
    $('search-history').classList.add('hidden');
}

// ===== UI HELPERS =====
function showLoading() { $('loading-screen').classList.remove('fade-out'); $('loading-screen').style.display = 'flex'; }
function hideLoading() { $('loading-screen').classList.add('fade-out'); setTimeout(() => { $('loading-screen').style.display = 'none'; }, 600); }
function showApp() { $('app').classList.remove('hidden'); $('main-content').classList.remove('hidden'); $('error-container').classList.add('hidden'); hideLoading(); }
function showError(title, msg) { hideLoading(); $('app').classList.remove('hidden'); $('main-content').classList.add('hidden'); $('error-container').classList.remove('hidden'); $('error-title').textContent = title; $('error-msg').textContent = msg; }
function hideError() { $('error-container').classList.add('hidden'); $('main-content').classList.remove('hidden'); }

// ===== TOAST NOTIFICATIONS =====
function showToast(message, duration = 5000) {
    const container = $('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ===== HISTORY =====
function addHistory(name, lat, lon) {
    const key = locationKey(name, lat, lon);
    history = history.filter(c => {
        if (typeof c === 'string') return c.toLowerCase() !== name.toLowerCase();
        return locationKey(c.name, c.lat, c.lon) !== key;
    });
    history.unshift({ name, lat, lon });
    history = history.slice(0, 10);
    localStorage.setItem('hist', JSON.stringify(history));
}
function renderHistory() {
    if (!history.length) { $('search-history').classList.add('hidden'); return; }
    $('history-list').innerHTML = history.map(c => {
        const name = typeof c === 'string' ? c : c.name;
        const lat = typeof c === 'string' ? '' : `data-lat="${c.lat}"`;
        const lon = typeof c === 'string' ? '' : `data-lon="${c.lon}"`;
        return `<div class="history-item" data-city="${escapeHtml(name)}" ${lat} ${lon}>🕐 ${escapeHtml(name)}</div>`;
    }).join('');
}

// ===== FAVORITES =====
function toggleFav() {
    if (!currentCity) return;
    const key = locationKey(currentCity, currentLat, currentLon);
    const idx = favorites.findIndex(f => locationKey(f.name, f.lat, f.lon) === key);
    if (idx >= 0) favorites.splice(idx, 1);
    else favorites.push({ name: currentCity, lat: currentLat, lon: currentLon });
    localStorage.setItem('favs', JSON.stringify(favorites));
    updateFavBtn();
    renderFavs();
}
function updateFavBtn() {
    const btn = $('fav-btn');
    if (!btn) return;
    const key = locationKey(currentCity, currentLat, currentLon);
    const isFav = favorites.some(f => locationKey(f.name, f.lat, f.lon) === key);
    btn.classList.toggle('active', isFav);
}
function renderFavs() {
    if (!favorites.length) { $('favorites-list').innerHTML = '<p class="empty-msg">No favorite cities yet.<br>Tap ♥ to add one!</p>'; return; }
    $('favorites-list').innerHTML = favorites.map(f => `<div class="fav-city-card" data-lat="${f.lat}" data-lon="${f.lon}" data-name="${escapeHtml(f.name)}"><div><div class="fav-city-name">${escapeHtml(f.name)}</div></div><button class="fav-remove" data-name="${escapeHtml(f.name)}">✕</button></div>`).join('');
}

// ===== EVENTS =====
function initEvents() {
    // Search
    $('search-input').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { searchCity(e.target.value.trim()); e.target.value = ''; $('search-history').classList.add('hidden'); } });
    $('search-input').addEventListener('focus', () => { renderHistory(); if (history.length) $('search-history').classList.remove('hidden'); });
    $('search-input').addEventListener('blur', () => { setTimeout(() => { $('search-history').classList.add('hidden'); $('search-suggestions').classList.add('hidden'); }, 250); });

    // Live search suggestions from custom locations and global API
    let searchTimeout;
    $('search-input').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const val = e.target.value.toLowerCase().trim();
        const sugBox = $('search-suggestions');
        if (val.length < 2) { sugBox.classList.add('hidden'); return; }
        $('search-history').classList.add('hidden');
        
        searchTimeout = setTimeout(async () => {
            let uniqueMatches = [];
            const seen = new Set();
            
            // 1. Local matches
            Object.entries(customLocations).forEach(([key, loc]) => {
                if (key.includes(val) || loc.name.toLowerCase().includes(val)) {
                    const lkey = locationKey(loc.name, loc.lat, loc.lon);
                    if (!seen.has(lkey)) { seen.add(lkey); uniqueMatches.push(loc); }
                }
            });
            
            // 2. Global API matches
            try {
                const geo = await apiGeo(val);
                geo.forEach(loc => {
                    const lkey = locationKey(loc.name, loc.lat, loc.lon);
                    if (!seen.has(lkey)) {
                        seen.add(lkey);
                        uniqueMatches.push(loc);
                    }
                });
            } catch (err) {
                // Ignore API errors for autocomplete
            }
            
            uniqueMatches = uniqueMatches.slice(0, 8);
            if (uniqueMatches.length === 0) { sugBox.classList.add('hidden'); return; }
            sugBox.innerHTML = uniqueMatches.map(loc => {
                const label = `${escapeHtml(loc.name)}${loc.state ? ', ' + escapeHtml(loc.state) : ''}${loc.country && loc.country !== 'IN' ? ', ' + escapeHtml(loc.country) : ''}`;
                return `<div class="suggestion-item" data-lat="${loc.lat}" data-lon="${loc.lon}" data-name="${escapeHtml(loc.name)}">📍 ${label}</div>`;
            }).join('');
            sugBox.classList.remove('hidden');
        }, 300);
    });

// ===== GEO =====
const handleGeoRequest = (isInlineRetry = false, isInitialLoad = false) => {
    if (!navigator.geolocation) {
        showToast('📍 Geolocation is not supported by your browser.');
        return;
    }
    let geoResolved = false;
    const geoOptions = { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 };
    const inlineBtn = $('inline-location-btn');
    
    if (isInlineRetry && inlineBtn) {
        inlineBtn.disabled = true;
        inlineBtn.querySelector('.inline-loc-text').textContent = 'Detecting...';
    }
    
    const geoFallback = (err) => {
        if (geoResolved) return;
        geoResolved = true;
        usingFallbackLocation = true;
        if (isInlineRetry && inlineBtn) {
            inlineBtn.disabled = false;
            if (err && err.code === 1 /* PERMISSION_DENIED */) {
                inlineBtn.querySelector('.inline-loc-text').textContent = 'Enable in browser settings';
                showToast('📍 Location permission blocked. Enable it from your browser\'s site settings, then tap again.');
            } else {
                inlineBtn.querySelector('.inline-loc-text').textContent = 'Failed. Try again?';
            }
        } else if (isInitialLoad) {
            if (inlineBtn) {
                inlineBtn.classList.remove('hidden');
                const currentText = inlineBtn.querySelector('.inline-loc-text').textContent;
                if (currentText !== 'Enable in browser settings') {
                    inlineBtn.querySelector('.inline-loc-text').textContent = 'Turn on location';
                }
            }
            searchCity('Mumbai');
        } else {
            showToast('📍 Could not detect location. Enable location services or search manually.');
        }
    };
    
    navigator.geolocation.getCurrentPosition(
        pos => {
            if (geoResolved) return;
            geoResolved = true;
            usingFallbackLocation = false;
            if (isInlineRetry && inlineBtn) {
                inlineBtn.disabled = false;
            }
            customCityName = null;
            currentCity = null;
            loadWeather(pos.coords.latitude, pos.coords.longitude);
        },
        geoFallback,
        geoOptions
    );
    setTimeout(() => geoFallback(null), 8500);
};

// ===== EVENTS =====
function initEvents() {
    // Search
    $('search-input').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { searchCity(e.target.value.trim()); e.target.value = ''; $('search-history').classList.add('hidden'); } });
    $('search-input').addEventListener('focus', () => { renderHistory(); if (history.length) $('search-history').classList.remove('hidden'); });
    $('search-input').addEventListener('blur', () => { setTimeout(() => { $('search-history').classList.add('hidden'); $('search-suggestions').classList.add('hidden'); }, 250); });

    // Suggestion clicks
    $('search-suggestions').addEventListener('click', e => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            customCityName = item.dataset.name;
            addHistory(item.dataset.name, parseFloat(item.dataset.lat), parseFloat(item.dataset.lon));
            $('search-input').value = '';
            $('search-suggestions').classList.add('hidden');
            loadWeather(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon));
        }
    });

    // History clicks
    $('history-list').addEventListener('click', e => {
        const item = e.target.closest('.history-item');
        if (item) {
            if (item.dataset.lat && item.dataset.lon) {
                customCityName = item.dataset.city;
                loadWeather(parseFloat(item.dataset.lat), parseFloat(item.dataset.lon));
            } else {
                searchCity(item.dataset.city);
            }
            $('search-input').value = '';
            $('search-history').classList.add('hidden');
        }
    });
    $('clear-history-btn').addEventListener('click', () => { history = []; localStorage.setItem('hist', '[]'); $('search-history').classList.add('hidden'); });

    // Location buttons
    $('location-btn').addEventListener('click', () => handleGeoRequest(false, false));
    if ($('inline-location-btn')) {
        $('inline-location-btn').addEventListener('click', () => handleGeoRequest(true, false));
    }

    // Unit toggle
    $('unit-toggle').addEventListener('click', () => {
        units = units === 'metric' ? 'imperial' : 'metric';
        $('unit-toggle').textContent = units === 'metric' ? '°C' : '°F';
        if (lastW && lastF) {
            renderWeather(lastW, lastF, lastA);
        } else if (currentLat) {
            loadWeather(currentLat, currentLon);
        }
    });

    // Favorites sidebar
    $('menu-btn').addEventListener('click', () => { renderFavs(); $('favorites-sidebar').classList.remove('hidden'); setTimeout(() => $('favorites-sidebar').classList.add('show'), 10); $('favorites-overlay').classList.remove('hidden'); });
    $('close-sidebar').addEventListener('click', closeSidebar);
    $('favorites-overlay').addEventListener('click', closeSidebar);
    $('favorites-list').addEventListener('click', e => {
        const card = e.target.closest('.fav-city-card');
        const rm = e.target.closest('.fav-remove');
        if (rm) { favorites = favorites.filter(f => locationKey(f.name, f.lat, f.lon) !== locationKey(rm.dataset.name, rm.closest('.fav-city-card').dataset.lat, rm.closest('.fav-city-card').dataset.lon)); localStorage.setItem('favs', JSON.stringify(favorites)); renderFavs(); return; }
        if (card) { customCityName = card.dataset.name || null; loadWeather(parseFloat(card.dataset.lat), parseFloat(card.dataset.lon)); closeSidebar(); }
    });

    // Error dismiss
    $('error-dismiss').addEventListener('click', () => { hideError(); $('search-input').focus(); });

    // Voice search
    $('voice-btn').addEventListener('click', () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert('Voice search not supported in this browser.'); return; }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = navigator.language || 'en-US';
        rec.onresult = e => { const t = e.results[0][0].transcript; $('search-input').value = t; searchCity(t); };
        rec.onerror = () => $('voice-btn').classList.remove('listening');
        rec.onend = () => $('voice-btn').classList.remove('listening');
        $('voice-btn').classList.add('listening');
        rec.start();
    });
}

function closeSidebar() { $('favorites-sidebar').classList.remove('show'); setTimeout(() => { $('favorites-sidebar').classList.add('hidden'); $('favorites-overlay').classList.add('hidden'); }, 350); }

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initBg();
    initEvents();

    // Proactively check permission state via Permissions API
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            const inlineBtn = $('inline-location-btn');
            if (result.state === 'denied' && inlineBtn) {
                inlineBtn.classList.remove('hidden');
                inlineBtn.querySelector('.inline-loc-text').textContent = 'Enable in browser settings';
            }
            result.addEventListener('change', () => {
                if (result.state === 'granted' && inlineBtn) {
                    inlineBtn.classList.add('hidden');
                }
            });
        }).catch(() => {});
    }

    if (navigator.geolocation) {
        handleGeoRequest(false, true);
    } else {
        searchCity('Mumbai');
    }
});
