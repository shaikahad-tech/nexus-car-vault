# NEXUS Car Vault

A futuristic 3D car catalog featuring **100 cars across 10 categories**, built with Three.js. Every car has a real free 3D model source — scraped from the top free 3D model repos on the web.

## What's New

All 100 cars now have **real 3D model sources** — zero procedural-only entries. Models are sourced from 6 different free repositories:

| Source | Count | License | Format |
|--------|-------|---------|--------|
| Sketchfab | 50 | CC-BY-4.0 / CC0 | Page link (download GLB) |
| Poly Pizza | 25 | CC0 / CC-BY-4.0 | GLTF/FBX download |
| GitHub repos | 12 | MIT / WTFPL / CC-BY | Various |
| Khronos glTF | 8 | CC-BY-4.0 / CC0 | Direct GLB URL (loadable in-browser) |
| GetGLB | 3 | CC-BY-4.0 | Direct GLB download |
| Kenney | 2 | CC0 | Pack download |

## Features

- **100 Cars** across 10 categories: Hypercar, Supercar, Sports, Muscle, Classic, EV, Luxury, SUV, Concept, Race
- **Live 3D Viewer** — click any car to see it in 3D with orbit controls
- **GLB Model Loading** — 8 cars load real GLB files directly in-browser via Khronos glTF Sample Assets
- **Procedural Fallback** — cars without directly-loadable GLB files get a procedural 3D car model with category-specific styling
- **Color Customization** — paint picker in the viewer changes the procedural car color in real-time
- **Search** by name, brand, or category
- **Filter** by category and 6 model source types
- **Sort** by name, year, power, or price
- **Favorites** — star cars and view your saved collection (persisted in localStorage)
- **Compare** — select up to 4 cars and view specs side-by-side
- **Keyboard Navigation** — ← → arrow keys to browse cars, ESC to close viewer
- **URL Deep-Linking** — share a car view via URL (?car=h001&cat=hypercar)
- **Source Attribution** — every car shows its model source, license, and a link to the original

## 3D Model Sources

Cars reference free 3D models from these repositories:

### Sketchfab (50 cars)
Models from Unity Fan (CC0 concept cars), sebbelon (low-poly BMW/Lamborghini/Mercedes), chibolowebon (Bugatti/Lambo), sezai_bey (Koenigsegg/Nissan), R1peer (Honda), robinmikart (classic cars), RgsDev (vehicle pack), and more.

### Poly Pizza (25 cars)
Models from Quaternius (CC0 sports cars, SUVs), David Sirera (Dodge Charger/Nissan GTR), PuKkBuMXDD (Ferrari F40), jacobleee05 (Camaro), Kris Tong (Camaro ZL1), ReppenThe303 (Sports Hatchback), Muhammad Reyhan (Mitsubishi/Toyota trucks), Mobolaji (Cybertruck).

### GitHub Repos (12 cars)
- [Mayawaaan/AudiR8](https://github.com/Mayawaaan/AudiR8) — MIT
- [ChamikaCSA/3d-tesla-workshop](https://github.com/ChamikaCSA/3d-tesla-workshop) — MIT
- [furkanyasinengin/mustang-showcase](https://github.com/furkanyasinengin/mustang-showcase) — CC-BY
- [WoXuS/interactive-mustang-model](https://github.com/WoXuS/interactive-mustang-model) — CC-BY
- [simti/webgl-toyota-configurator](https://github.com/simti/webgl-toyota-configurator) — MIT
- [markste-in/c42](https://github.com/markste-in/c42) — WTFPL (Alfa Romeo F1)
- [ErfanMo77/gltf-research-scenes](https://github.com/ErfanMo77/gltf-research-scenes) — CC0 (Pontiac GTO scene)

### Khronos glTF Sample Assets (8 cars — directly loadable GLB URLs)
- [CarConcept.glb](https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb) — CC-BY-4.0
- [ToyCar.glb](https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb) — CC0

### Kenney (2 cars)
- [Car Kit](https://kenney.nl/assets/car-kit) — CC0

### GetGLB (3 cars)
- [Blue Muscle Car](https://www.getglb.com/vehicles/blue-muscle-car) — CC-BY-4.0
- [Low-Poly City Car](https://www.getglb.com/vehicles/low-poly-city-car) — CC-BY-4.0

## Tech Stack

- **Three.js** r160 (via ES modules + importmap)
- **GLTFLoader** for loading .glb files directly in-browser
- **Vanilla JS** — no framework, no build step
- **CSS Grid** responsive layout
- **localStorage** for favorites persistence

## Quick Start

```bash
# Python dev server
python3 serve.py

# Or any static server
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Project Structure

```
nexus-car-vault/
├── index.html          # Entry point with importmap + color picker
├── app.js              # Main application (GLB loading, viewer, search, filter)
├── styles.css          # Futuristic dark UI with 6 source badge types
├── serve.py            # Local dev server
└── src/
    └── catalog.js      # 100-car database with real model URLs + attribution
```

## Car Data Schema

Each car includes:

```js
{
  id, name, brand, year, category,
  power, topSpeed, accel, drivetrain, engine, price,
  modelSource,    // 'sketchfab' | 'poly' | 'github' | 'gltf-direct' | 'kenney' | 'getglb'
  modelUrl,       // URL to the model page or direct GLB file
  license,         // License of the 3D model
  sourceCredit     // Attribution text with author name
}
```

## Categories

| Key | Label | Example Cars |
|-----|-------|-------------|
| hypercar | Hypercar | Bugatti Chiron, Koenigsegg Jesko, Rimac Nevera |
| supercar | Supercar | Ferrari 488, Lamborghini Huracan, McLaren 720S |
| sports | Sports Car | Porsche 911, BMW M4, Corvette C8, Supra |
| muscle | Muscle Car | Shelby GT500, Charger Hellcat, Camaro ZL1 |
| classic | Classic | Ferrari 250 GTO, Jaguar E-Type, Mercedes 300 SL |
| ev | Electric Vehicle | Tesla Plaid, Lucid Sapphire, Cybertruck, Taycan |
| luxury | Luxury | Rolls-Royce Phantom, Bentley Continental GT |
| suv | SUV / Off-Road | Jeep Wrangler, Urus, G63 AMG, Defender |
| concept | Concept Car | BMW Vision Next 100, Mercedes AVTR, Bugatti Bolide |
| race | Race / Track | Ferrari 488 GTE, Porsche 911 RSR, Alfa Romeo C42 F1 |

## License

MIT for the application code. 3D model licenses vary per source — see each car's `license` field.
