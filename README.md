# Mundial 2026 · Simulador Monte Carlo

Dashboard online que simula el Mundial 2026 con un modelo **ELO + Poisson** (igual que el video [I Simulated the World Cup, and the US won*](https://www.youtube.com/watch?v=w5NK7bPjQkw)) y agrega resultados sobre **100.000 simulaciones**.

- **Stack**: Next.js 15 · TypeScript · Tailwind v4 (OKLCH) · React Three Fiber · GSAP · D3 · next-intl (ES/EN).
- **Motor**: TypeScript puro, ~35k simulaciones/seg en Node; ~15-25k en navegador vía Web Worker.
- **Datos**: sorteo oficial FIFA del 5-dic-2025, ratings ELO de eloratings.net.

## Desarrollo

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
npm run build        # production build
npm run scrape-elo   # refrescar ELO (eloratings.net)
```

## Metodología

### ELO win expectancy

```
We = 1 / (10^(-dr/400) + 1)
dr = ELO_A − ELO_B + home_bonus  (+100 para selecciones anfitrionas en fase de grupos)
```

### Goles (Poisson independiente)

```
λ_team = clamp(1.30 + 0.18 · (ELO_team − ELO_opp + home_bonus) / 100,  0.15,  6.0)
goles ~ Poisson(λ_team)
```

### Empate en eliminatoria

Coin flip (50/50) — representa los penales.

### Verificación

- Suma de probabilidades de campeón = 100.000% (cuentas exactas).
- Promedio de goles por partido = ~2.6 (consistente con históricos 2.5-2.7).
- Top-5 candidatos = consenso ELO/bookmakers: España, Argentina, Francia, Brasil, Portugal.

## Estructura

```
src/
├─ app/[locale]/      Next.js App Router con i18n (es default, en)
├─ components/        Hero · ChampionProbBar · StageMatrix · GroupCards · BracketTree · GoalStats · SurpriseCards
├─ data/              teams.json · groups.json · bracket.json
├─ hooks/             useSimulation (gestiona el Web Worker)
├─ i18n/              messages/es.json · messages/en.json
└─ lib/sim/           engine · tournament · group · knockout · elo · goals · rng · worker
```

## Créditos

- ELO ratings: [eloratings.net](https://www.eloratings.net/)
- Sorteo oficial: [FIFA](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026)
- Banderas: [circle-flags](https://hatscripts.github.io/circle-flags/) (MIT)
