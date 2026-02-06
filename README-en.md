# Architecture Diagram Maker

[日本語](README.md) | English

## Overview

A lightweight editor for quickly drafting architecture diagrams and saving them as JSON. In addition to local storage, you can enable Azure Cosmos DB for cloud storage.

## Key Features

- Icon palette (auto-detect icons under `public/icons`)
- Optional sample icons under `public/icons-sample` (controlled by env)
- Boxes, text, arrows, and lines
- Z-order control plus duplicate/delete
- Save/load JSON in local storage
- Export to PNG / JSON
- Browse and search icons on the catalog page
- Auto-save history snapshots and restore via `/history`
- Configure history retention and PNG export scale in settings

## Docs

- [docs/architecture-en.md](docs/architecture-en.md): Architecture overview
- [docs/architecture-diagram-en.md](docs/architecture-diagram-en.md): Architecture diagram
- [docs/technology-en.md](docs/technology-en.md): Technology stack overview
- [docs/features-en.md](docs/features-en.md): Implemented features
- [docs/operations-en.md](docs/operations-en.md): Operations guide (detailed)

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

Minimal expectations:

- `NODE_ENV=production`
- Health checks use `/api/health`
- Enable managed identity when Cosmos DB is used

## Azure Integration

The `/api/diagrams` route supports Azure Cosmos DB persistence. If the environment variables are not set, it falls back to local storage.

### Cosmos DB setup

Set the following to enable Cosmos DB via DefaultAzureCredential. Ensure the database and container are created in advance.

- `COSMOS_ENDPOINT`
- `COSMOS_DATABASE`
- `COSMOS_CONTAINER`

> The container partition key is expected to be `/id`. With AAD auth, grant the `Cosmos DB Built-in Data Contributor` role.

For local development, use Azure CLI credentials (`az login`). In production, run with a managed identity in Azure Container Apps.

## UI Defaults

- `NEXT_PUBLIC_HISTORY_LIMIT`: default history retention (10-1000)
- `NEXT_PUBLIC_EXPORT_SCALE`: default PNG export scale (1-8)

Values changed in settings are persisted to local storage.

## Localization

Use the language dropdown in the header to toggle between Japanese and English. The selection is preserved with the `?lang=ja` / `?lang=en` query parameter.
