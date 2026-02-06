# Implemented Features

[日本語](features.md) | English

## Editor Features

- Icon palette (auto-detects `public/icons`)
- Toggle sample icons under `public/icons-sample`
- Add boxes, text, arrows, and lines
- Select, move, and resize elements
- Z-order control (bring to front / send to back)
- Duplicate and delete
- Edit history retention (limit adjustable in settings)

## Storage and Sharing

- Save JSON to browser local storage
- JSON export / import
- PNG export
- Cloud persistence via `/api/diagrams` when Cosmos DB is configured
- Store history snapshots locally and restore from `/history`

## Pages and Navigation

- `/`: landing page
- `/editor`: diagram editor
- `/items`: icon catalog and search (`/api/icons`)
- `/history`: local history list and restore
- `/settings`: history retention and PNG export scale settings
- `/about`: app overview

## Shared Features

- Language switcher (Japanese / English)
- Health checks via `/api/health`
