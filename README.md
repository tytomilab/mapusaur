![](./public/assets/banner.png)

# MAPusaur

> Turn GPX into race-ready maps.

MAPusaur is an open-source GPX-to-map engine that transforms route data into race-ready visuals with elevation profiles. Built for endurance athletes, trail runners, and race organizers.

---

## Why MAPusaur

Race organizers and athletes often:

* export GPX from tools like Google Earth or Strava
* manually recreate maps in Canva or design tools
* rebuild elevation profiles separately
* spend hours aligning visuals

MAPusaur removes that friction by turning raw route data into clean, structured race maps.

---

## Features (Planned + In Progress)

* **GPX-based route rendering** — visualize routes directly from GPX files
* **Elevation profile generation** — understand ascent and descent visually
* **Custom race layouts** — adapt visuals for different race formats
* **High-resolution export** — generate shareable race-ready outputs

---

## Data Providers and Mapping Stack

* **Map data**: OpenStreetMap contributors
* **Tiles**: OpenMapTiles
* **Tile hosting**: OpenFreeMap
* **Geocoding**: Nominatim
* **Map renderer**: MapLibre

---

## User Interface

![](./public/assets/screenshots/Web_UI.png)

---

## Run

```bash
bun install
bun run dev
```

---

## Environment

Check [`.env.example`](./.env.example) for available variables.
Most are optional for local development.

---

## Build

```bash
bun run build
```

---

## Deploy with Docker (Self-Hosting)

### Build and run with Docker Compose

```bash
docker compose up -d --build
```

Default: `http://localhost:7200`

---

### Stop deployment

```bash
docker compose down
```

---

## Contributing

This project is evolving from a cartographic engine into a race-focused GPX system.

* Keep contributions clean and modular
* Follow existing architecture patterns
* Avoid hardcoding values
* Review AI-generated code before submitting

---

## Acknowledgment

This project builds upon the excellent work from TerraInk .

MAPusaur adapts and extends the engine toward GPX-based race visualization and endurance use cases.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Trademark

MAPusaur™ is an independent project.

The underlying codebase is MIT-licensed, but original project names and branding (such as TerraInk) remain the property of their respective owners.

---
