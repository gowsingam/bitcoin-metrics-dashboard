# Bitcoin Metrics Dashboard

Eine einzelne Seite mit allen wichtigen, öffentlich verfügbaren Bitcoin-Metriken:

- **Preis & Änderung** — aktueller Preis (USD/EUR/CHF), 1h/24h/7d/14d/30d/60d/200d/1y-Änderung, 7-Tage-Sparkline
- **Marktdaten** — Marktkapitalisierung, Fully Diluted Valuation, 24h-Volumen, 24h-Hoch/Tief, Allzeithoch/-tief
- **Angebot** — Umlauf-, Gesamt- und Maximalversorgung mit Fortschrittsbalken
- **Netzwerk & On-Chain** — Blockhöhe, Hashrate, Difficulty, nächste Difficulty-Anpassung, Mempool-Größe
- **Gebühren** — empfohlene Transaktionsgebühren (sat/vB)
- **Sentiment** — CoinGecko Community-Stimmung, Fear & Greed Index
- **Entwickleraktivität** — GitHub-Stars, Forks, Watcher, offene Issues von `bitcoin/bitcoin`
- **Allgemeine Infos** — Genesis-Block, Hashing-Algorithmus, Blockzeit, Kategorien

Reines Vanilla-HTML/CSS/JS, keine Build-Schritte, keine Server-Komponente — alle
Daten werden client-seitig von öffentlichen APIs geladen und alle 60 Sekunden
aktualisiert.

## Datenquellen

- [CoinGecko API](https://www.coingecko.com/en/api) — Preis, Marktdaten, Angebot, Sentiment, allgemeine Infos
- [mempool.space API](https://mempool.space/docs/api/rest) — Netzwerk, On-Chain-Daten, Gebühren
- [GitHub API](https://docs.github.com/en/rest) — Entwickleraktivität von `bitcoin/bitcoin`
- [alternative.me](https://alternative.me/crypto/fear-and-greed-index/) — Fear & Greed Index

## Lokal starten

```bash
python3 -m http.server 8000 --directory public
```

Dann `http://localhost:8000` im Browser öffnen.

## Deployment

Statische Seite, deploybar auf Firebase Hosting:

```bash
firebase deploy --only hosting
```
