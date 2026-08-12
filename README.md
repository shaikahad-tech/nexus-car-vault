# NEXUS Car Vault

A futuristic 3D car catalog featuring **100 cars across 10 categories**, built with Three.js. Each car has real specifications, and the 3D viewer generates a procedural model on the fly with category-specific styling.

## Features

- **100 Cars** across 10 categories: Hypercar, Supercar, Sports, Muscle, Classic, EV, Luxury, SUV, Concept, Race
- **Live 3D Viewer** — click any car to see a procedurally generated 3D model with orbit controls
- **Search** by name, brand, or category
- **Filter** by category and model source (Sketchfab, GitHub, Kenney, Procedural)
- **Sort** by name, year, power, or price
- **Favorites** — star cars and view your saved collection (persisted in localStorage)
- **Compare** — select up to 4 cars and view specs side-by-side
- **Source Attribution** — every car with an external 3D model links back to its original source

## 3D Model Sources

The catalog references free 3D models from these sources:

| Source | License | Count |
|--------|---------|-------|
| Procedural (built-in) | N/A | 82 |
| Sketchfab | CC-BY-4.0 | 9 |
| GitHub repos | MIT / WTFPL / CC-BY | 7 |
| Kenney Car Kit | CC0 | 2 |

Cars without an external model use a procedural Three.js car generator that adapts body shape, color, and accessories (spoilers, splitters, wheel design) based on the car's category.

## Tech Stack

- **Three.js** r160 (via ES modules + importmap)
- **Vanilla JS** — no framework, no build step
- **CSS Grid** responsive layout
- **localStorage** for favorites persistence

## Quick Start

```bash
# Option 1: Python dev server
python3 serve.py

# Option 2: Any static server
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Project Structure

```
nexus-car-vault/
├── index.html          # Entry point with importmap
├── app.js              # Main application logic
├── styles.css          # Futuristic dark UI
├── serve.py            # Local dev server
└── src/
    └── catalog.js      # 100-car database with specs + sources
```

## Car Data Schema

Each car in `src/catalog.js` includes:

```js
{
  id, name, brand, year, category,
  power, topSpeed, accel, drivetrain, engine, price,
  modelSource,    // 'procedural' | 'sketchfab' | 'github' | 'kenney'
  modelUrl,       // URL to external model (empty if procedural)
  license,         // License of the 3D model
  sourceCredit     // Attribution text
}
```

## Categories

| Key | Label | Example Cars |
|-----|-------|-------------|
| hypercar | Hypercar | Bugatti Chiron, Koenigsegg Jesko, Rimac Nevera |
| supercar | Supercar | Ferrari 488, Lamborghini Huracan, McLaren 720S |
| sports | Sports Car | Porsche 911, BMW M4, Corvette C8 |
| muscle | Muscle Car | Shelby GT500, Charger Hellcat, Camaro ZL1 |
| classic | Classic | Ferrari 250 GTO, Jaguar E-Type, Mercedes 300 SL |
| ev | Electric Vehicle | Tesla Model S Plaid, Lucid Air, Porsche Taycan |
| luxury | Luxury | Rolls-Royce Phantom, Bentley Continental GT |
| suv | SUV / Off-Road | Jeep Wrangler, Lamborghini Urus, G63 AMG |
| concept | Concept Car | BMW Vision Next 100, Mercedes Vision AVTR |
| race | Race / Track | Ferrari 488 GTE, Porsche 911 RSR, Alfa Romeo C42 F1 |

## License

MIT for the application code. 3D model licenses vary per source — see each car's `license` field.
