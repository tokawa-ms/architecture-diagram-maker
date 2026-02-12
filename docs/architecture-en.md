# Architecture Overview

[日本語](architecture.md) | English

## Purpose

Architecture Diagram Maker is a lightweight editor for drafting architecture diagrams and saving them as JSON. It supports local storage by default and enables Azure Cosmos DB for cloud storage when configured.

## Core Components

- Next.js (App Router, TypeScript)
  - Pages: `/`, `/editor`, `/items`, `/history`, `/settings`, `/about`, `/account` (MSAL), `/login` (simple auth)
  - API: `/api/health`, `/api/icons`, `/api/diagrams`, `/api/diagnostics`, `/api/auth/login`, `/api/auth/logout`
- UI Components
  - Header/footer, tool panels, palette, inspector, and more
- Data Layer
  - Local storage by default (saved diagrams, history, drafts)
  - Cosmos DB via API when configured

## Data Flow

1. Users create/update diagrams on the canvas
2. Save posts to `/api/diagrams`
3. If Cosmos DB is not configured, the client falls back to local storage
4. List/load/delete calls use GET/DELETE on `/api/diagrams`

## Cosmos DB Integration Notes

- SDK: `@azure/cosmos` + `DefaultAzureCredential`
- Required env vars: `COSMOS_ENDPOINT`, `COSMOS_DATABASE`, `COSMOS_CONTAINER`
- Partition key: `/id`
- Listing query: `SELECT c.id, c.name, c.updatedAt FROM c`
- Errors are logged with diagnostic details for troubleshooting

> Cosmos DB enforces a 2 MB item limit. Keep each diagram payload within this bound.

## Localization

- Language selection persists via `?lang=ja` / `?lang=en`
- Switcher in the header updates the query param
- Strings are centralized in `src/lib/i18n.ts`

## Configuration

- `PORT`: listening port on ACA (default 3000)
- `NODE_ENV`: development / production
- `ICONS_SAMPLE_ENABLED`: show `public/icons-sample` in the palette
- `NEXT_PUBLIC_HISTORY_LIMIT`: default history retention
- `NEXT_PUBLIC_EXPORT_SCALE`: default PNG export scale
- `USER_NAME` / `USER_PASS`: simple auth credentials (optional)
- `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` / `NEXT_PUBLIC_AZURE_AD_TENANT_ID`: Microsoft Entra ID (MSAL) auth
- `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI`: MSAL redirect URI
- Cosmos DB env vars are optional and only needed for cloud persistence

## Security and Auth

- When NEXT_PUBLIC_AZURE_AD_* is set, Microsoft Entra ID (MSAL) auth is enabled and ID tokens are validated in `/api/diagrams` to isolate data per email
- MSAL configuration takes precedence over simple auth
- When USER_NAME / USER_PASS are set, simple login is enabled and auth cookies are issued via `/login` and `/api/auth/*`
- Local dev uses Azure CLI (`az login`) via AAD
- Production uses managed identity on Azure Container Apps
- No secrets or connection strings are embedded in code

## Related Docs

- [docs/architecture-diagram-en.md](architecture-diagram-en.md): Architecture diagram
- [docs/technology-en.md](technology-en.md): Technology stack overview
- [docs/features-en.md](features-en.md): Implemented features
- [docs/operations-en.md](operations-en.md): Operational guidance (detailed)
