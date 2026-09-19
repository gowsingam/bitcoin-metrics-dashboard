'use strict';

const REFRESH_MS = 60_000;
const CCY_LOCALE = { usd: 'en-US', eur: 'de-DE', chf: 'de-CH' };

let coinData = null;
let currentCcy = 'usd';

const $ = (sel) => document.querySelector(sel);

function fmtCurrency(value, ccy, opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const locale = CCY_LOCALE[ccy] || 'en-US';
  const digits = opts.digits ?? (Math.abs(value) >= 1 ? 0 : 6);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: ccy.toUpperCase(),
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
      notation: opts.compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return `${value} ${ccy.toUpperCase()}`;
  }
}

function fmtNumber(value, opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: opts.digits ?? 0,
    notation: opts.compact ? 'compact' : 'standard',
  }).format(value);
}

function fmtPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

function fmtDate(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtRelativeTime(date) {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function signClass(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value > 0 ? 'up' : value < 0 ? 'down' : '';
}

function tile(label, value, { sub = '', cls = '' } = {}) {
  const div = document.createElement('div');
  div.className = 'tile';
  div.innerHTML = `
    <p class="tile-label">${label}</p>
    <p class="tile-value ${cls}">${value}</p>
    ${sub ? `<p class="tile-sub">${sub}</p>` : ''}
  `;
  return div;
}

function renderGrid(gridId, tiles) {
  const grid = $(gridId);
  grid.replaceChildren(...tiles);
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

/* ---------- CoinGecko: price, market, supply, sentiment, info ---------- */

async function loadCoinGecko() {
  const url = 'https://api.coingecko.com/api/v3/coins/bitcoin'
    + '?localization=false&tickers=false&market_data=true&sparkline=true';
  coinData = await fetchJSON(url);
  renderHero();
  renderChanges();
  renderMarket();
  renderSupply();
  renderSentiment();
  renderInfo();
}

function renderHero() {
  const md = coinData.market_data;
  const price = md.current_price[currentCcy];
  $('#hero-price').textContent = fmtCurrency(price, currentCcy, { digits: price >= 1 ? 2 : 6 });

  const change24h = md.price_change_percentage_24h_in_currency?.[currentCcy] ?? md.price_change_percentage_24h;
  const badge = $('#badge-24h');
  badge.textContent = `24h ${fmtPercent(change24h)}`;
  badge.className = `badge ${change24h > 0 ? 'badge-up' : change24h < 0 ? 'badge-down' : ''}`;

  $('#badge-rank').textContent = `Rank #${coinData.market_cap_rank ?? '–'}`;
  $('#last-updated').textContent = `Stand: ${fmtRelativeTime(new Date(md.last_updated))} · aktualisiert alle 60s`;

  renderSparkline(md.sparkline_7d?.price || []);
}

function renderSparkline(prices) {
  const svg = $('#sparkline');
  if (!prices.length) { svg.innerHTML = ''; return; }
  const w = 600, h = 140, pad = 6;
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const step = (w - pad * 2) / (prices.length - 1);
  const points = prices.map((p, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (p - min) / range);
    return [x, y];
  });
  const trendUp = prices[prices.length - 1] >= prices[0];
  const color = trendUp ? 'var(--good)' : 'var(--critical)';
  const line = points.map((p) => p.join(',')).join(' ');
  const areaPath = `M${points[0][0]},${h - pad} L${line.split(' ').join(' L')} L${points[points.length - 1][0]},${h - pad} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#sparkFill)" stroke="none"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function renderChanges() {
  const md = coinData.market_data;
  const periods = [
    ['1h', md.price_change_percentage_1h_in_currency?.[currentCcy]],
    ['24h', md.price_change_percentage_24h],
    ['7d', md.price_change_percentage_7d],
    ['14d', md.price_change_percentage_14d],
    ['30d', md.price_change_percentage_30d],
    ['60d', md.price_change_percentage_60d],
    ['200d', md.price_change_percentage_200d],
    ['1y', md.price_change_percentage_1y],
  ];
  renderGrid('#grid-changes', periods.map(([label, val]) =>
    tile(label, fmtPercent(val), { cls: signClass(val) })));
}

function renderMarket() {
  const md = coinData.market_data;
  const ccy = currentCcy;
  const tiles = [
    tile('Marktkapitalisierung', fmtCurrency(md.market_cap[ccy], ccy, { compact: true })),
    tile('Fully Diluted Valuation', fmtCurrency(md.fully_diluted_valuation?.[ccy], ccy, { compact: true })),
    tile('24h Volumen', fmtCurrency(md.total_volume[ccy], ccy, { compact: true })),
    tile('24h Hoch', fmtCurrency(md.high_24h[ccy], ccy)),
    tile('24h Tief', fmtCurrency(md.low_24h[ccy], ccy)),
    tile('Allzeithoch (ATH)', fmtCurrency(md.ath[ccy], ccy), {
      sub: `${fmtDate(md.ath_date[ccy])} · ${fmtPercent(md.ath_change_percentage[ccy])}`,
      cls: 'down',
    }),
    tile('Allzeittief (ATL)', fmtCurrency(md.atl[ccy], ccy), {
      sub: `${fmtDate(md.atl_date[ccy])} · ${fmtPercent(md.atl_change_percentage[ccy])}`,
      cls: 'up',
    }),
    tile('Marktkap.-Änderung 24h', fmtCurrency(md.market_cap_change_24h_in_currency?.[ccy], ccy, { compact: true }), {
      cls: signClass(md.market_cap_change_percentage_24h),
    }),
  ];
  renderGrid('#grid-market', tiles);
}

function renderSupply() {
  const md = coinData.market_data;
  const circulating = md.circulating_supply;
  const max = md.max_supply;
  const tiles = [
    tile('Umlaufversorgung', `${fmtNumber(circulating)} BTC`),
    tile('Gesamtversorgung', `${fmtNumber(md.total_supply)} BTC`),
    tile('Maximalversorgung', max ? `${fmtNumber(max)} BTC` : 'Unbegrenzt'),
  ];
  renderGrid('#grid-supply', tiles);

  if (max) {
    const pct = (circulating / max) * 100;
    $('#supply-fill').style.width = `${Math.min(pct, 100).toFixed(3)}%`;
    $('#supply-label').textContent = `${pct.toFixed(3)}% der maximalen 21.000.000 BTC im Umlauf · verbleibend: ${fmtNumber(max - circulating)} BTC`;
  }
}

function renderSentiment() {
  const tiles = [
    tile('Community-Stimmung (positiv)', coinData.sentiment_votes_up_percentage != null
      ? `${coinData.sentiment_votes_up_percentage.toFixed(1)}%` : '–', { cls: 'up' }),
    tile('Community-Stimmung (negativ)', coinData.sentiment_votes_down_percentage != null
      ? `${coinData.sentiment_votes_down_percentage.toFixed(1)}%` : '–', { cls: 'down' }),
  ];
  renderGrid('#grid-sentiment', tiles);
  loadFearGreed(tiles);
}

async function loadFearGreed(existingTiles) {
  try {
    const data = await fetchJSON('https://api.alternative.me/fng/?limit=1');
    const entry = data.data?.[0];
    if (!entry) return;
    const val = Number(entry.value);
    const cls = val >= 55 ? 'up' : val <= 45 ? 'down' : '';
    const fgTile = tile('Fear &amp; Greed Index', `${entry.value} · ${translateFng(entry.value_classification)}`, { cls });
    renderGrid('#grid-sentiment', [...existingTiles, fgTile]);
  } catch (e) {
    console.warn('Fear & Greed Index nicht verfügbar', e);
  }
}

function translateFng(label) {
  const map = {
    'Extreme Fear': 'Extreme Angst',
    'Fear': 'Angst',
    'Neutral': 'Neutral',
    'Greed': 'Gier',
    'Extreme Greed': 'Extreme Gier',
  };
  return map[label] || label;
}

function renderInfo() {
  const tiles = [
    tile('Genesis-Block', fmtDate(coinData.genesis_date)),
    tile('Hashing-Algorithmus', coinData.hashing_algorithm || '–'),
    tile('Blockzeit', coinData.block_time_in_minutes ? `${coinData.block_time_in_minutes} Min.` : '–'),
    tile('Kategorien', (coinData.categories || []).slice(0, 3).join(', ') || '–'),
  ];
  renderGrid('#grid-info', tiles);
}

/* ---------- mempool.space: network, fees ---------- */

async function loadMempool() {
  const [height, fees, diffAdj, hashrate, mempool] = await Promise.all([
    fetchJSON('https://mempool.space/api/blocks/tip/height'),
    fetchJSON('https://mempool.space/api/v1/fees/recommended'),
    fetchJSON('https://mempool.space/api/v1/difficulty-adjustment'),
    fetchJSON('https://mempool.space/api/v1/mining/hashrate/3d'),
    fetchJSON('https://mempool.space/api/mempool'),
  ]);

  const hashrateEH = hashrate.currentHashrate / 1e18;
  const diffT = hashrate.currentDifficulty / 1e12;
  const diffChangeCls = diffAdj.difficultyChange > 0 ? 'up' : 'down';
  const retargetDate = new Date(diffAdj.estimatedRetargetDate);

  renderGrid('#grid-network', [
    tile('Blockhöhe', fmtNumber(height)),
    tile('Hashrate (3d Ø)', `${hashrateEH.toFixed(1)} EH/s`),
    tile('Difficulty', `${fmtNumber(diffT, { digits: 1 })} T`),
    tile('Nächste Difficulty-Anpassung', fmtPercent(diffAdj.difficultyChange), {
      cls: diffChangeCls,
      sub: `in ${fmtNumber(diffAdj.remainingBlocks)} Blöcken · ~${retargetDate.toLocaleDateString('de-DE')}`,
    }),
    tile('Mempool: Transaktionen', fmtNumber(mempool.count)),
    tile('Mempool: Größe', `${(mempool.vsize / 1e6).toFixed(1)} vMB`),
  ]);

  renderGrid('#grid-fees', [
    tile('Höchste Priorität', `${fees.fastestFee} sat/vB`),
    tile('30 Min.', `${fees.halfHourFee} sat/vB`),
    tile('1 Stunde', `${fees.hourFee} sat/vB`),
    tile('Economy', `${fees.economyFee} sat/vB`),
    tile('Minimum', `${fees.minimumFee} sat/vB`),
  ]);
}

/* ---------- GitHub: developer activity ---------- */

async function loadGitHub() {
  const repo = await fetchJSON('https://api.github.com/repos/bitcoin/bitcoin');
  renderGrid('#grid-dev', [
    tile('GitHub Stars', fmtNumber(repo.stargazers_count, { compact: true })),
    tile('Forks', fmtNumber(repo.forks_count, { compact: true })),
    tile('Watcher', fmtNumber(repo.subscribers_count, { compact: true })),
    tile('Offene Issues', fmtNumber(repo.open_issues_count)),
  ]);
}

/* ---------- orchestration ---------- */

function setCurrency(ccy) {
  currentCcy = ccy;
  document.querySelectorAll('.currency-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.ccy === ccy);
  });
  if (coinData) {
    renderHero();
    renderChanges();
    renderMarket();
  }
}

function showSectionError(gridId, message) {
  const grid = document.querySelector(gridId);
  if (grid && !grid.children.length) {
    grid.innerHTML = `<p class="tile-sub">${message}</p>`;
  }
}

async function refreshAll() {
  await Promise.allSettled([
    loadCoinGecko().catch((e) => { console.error(e); showSectionError('#grid-market', 'CoinGecko-Daten aktuell nicht verfügbar.'); }),
    loadMempool().catch((e) => { console.error(e); showSectionError('#grid-network', 'mempool.space aktuell nicht verfügbar.'); }),
    loadGitHub().catch((e) => { console.error(e); showSectionError('#grid-dev', 'GitHub-Daten aktuell nicht verfügbar.'); }),
  ]);
}

document.querySelectorAll('.currency-btn').forEach((btn) => {
  btn.addEventListener('click', () => setCurrency(btn.dataset.ccy));
});

refreshAll();
setInterval(refreshAll, REFRESH_MS);
