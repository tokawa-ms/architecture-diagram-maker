# Architecture Diagram Maker

[日本語](README.md) | English

## Overview

A lightweight editor for quickly drafting architecture diagrams and saving them as JSON. The current focus is on UI and local storage, with Azure Cosmos DB integration planned later.

## Key Features

- Icon palette (auto-detect icons under `public/icons`)
- Optional sample icons under `public/icons-sample` (controlled by env)
- Boxes, text, arrows, and lines
- Z-order control plus duplicate/delete
- Save/load JSON in local storage
- Export to PNG / JSON

## Local Development

1. Create the environment file.

```
cp .env.template .env
```

2. Install dependencies.

```
npm install
```

3. Start the development server.

```
npm run dev
```

Visit `http://localhost:3000/editor` to open the editor.

### Icons

- Place production icons under `public/icons` (you can use nested folders).
  - Contents under `public/icons` are ignored by Git via `.gitignore`.
  - The folder structure is used as-is in the palette.
- Sample icons live under `public/icons-sample`.
  - Control whether they appear in the palette via `ICONS_SAMPLE_ENABLED`.

## Docker Run

```
docker build -t architecture-diagram-maker .
docker run --rm -p 3000:3000 -e PORT=3000 architecture-diagram-maker
```

Health checks use `/api/health`.

## Azure Container Apps Deployment Overview

1. Prepare an Azure Container Apps environment and Log Analytics workspace.
2. Build and push the container image to Azure Container Registry.
3. Create the Container App and configure the `PORT` environment variable.

## Azure Integration

Storage is currently implemented with local storage only. The `/api/diagrams` route is intended for future Azure SDK-based persistence.

## Localization

Use the language dropdown in the header to toggle between Japanese and English. The selection is preserved with the `?lang=ja` / `?lang=en` query parameter.
