# Operations Guide

[日本語](operations.md) | English

## Local Development

1. Copy `.env.template` to `.env`
2. Install dependencies with `npm install`
3. Start the dev server with `npm run dev`
4. Visit `http://localhost:3000/editor`

## Icon Management

- Place production icons under `public/icons`
- `public/icons` is git-ignored
- Toggle `public/icons-sample` via `ICONS_SAMPLE_ENABLED`

## Storage and Recovery

- Default storage is browser local storage
- When Cosmos DB is configured, the app uses `/api/diagrams` for cloud persistence
- JSON export/import provides lightweight backups
- History snapshots are stored locally and can be restored from `/history`

## Settings

- Use `/settings` to adjust history retention and PNG export scale
- Defaults can be overridden via environment variables
  - `NEXT_PUBLIC_HISTORY_LIMIT` (10-1000)
  - `NEXT_PUBLIC_EXPORT_SCALE` (1-8)
- Updated values are saved to local storage

## Simple Auth

- Setting `USER_NAME` / `USER_PASS` requires users to log in at `/login`
- `/api/auth/login` issues the auth cookie and `/api/auth/logout` clears it

## Microsoft Entra ID (MSAL) Auth

- Register a SPA in Entra ID and add redirect URIs for `http://localhost:3000` and your production URL
- Configure the following environment variables
  - `NEXT_PUBLIC_AZURE_AD_CLIENT_ID`
  - `NEXT_PUBLIC_AZURE_AD_TENANT_ID`
  - `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI`
- When MSAL is enabled, `/api/diagrams` receives an ID token and isolates Cosmos DB data per email
- When MSAL is enabled, `/account` shows account details

## Hosting on Azure Container Apps (detailed)

1. Create Azure Container Registry (ACR)
2. Build and push the image to ACR
3. Create the Container Apps environment and app
4. Configure environment variables
   - `PORT` (default 3000)
   - `NODE_ENV=production`
   - `COSMOS_ENDPOINT` / `COSMOS_DATABASE` / `COSMOS_CONTAINER` when using Cosmos DB
5. Configure health checks to `/api/health`
6. Enable managed identity for the app
7. Connect logs to Log Analytics / Application Insights

> The app runs as a single container using `next start`.

## Cosmos DB Configuration (detailed)

### Resource Setup

- Create a Cosmos DB (SQL API) account
- Create a database and container
  - Partition key: `/id`
  - Set RU to match expected traffic

### Authentication (AAD)

- Local: Azure CLI credentials (`az login`)
- Production: managed identity on Container Apps
- Assign RBAC role
  - Read/write: `Cosmos DB Built-in Data Contributor`
  - Read-only: `Cosmos DB Built-in Data Reader`

### Connection Settings

- Set the following in `.env` or ACA env vars
  - `COSMOS_ENDPOINT`
  - `COSMOS_DATABASE`
  - `COSMOS_CONTAINER`

> Cosmos DB enforces a 2 MB item limit, so keep each diagram payload under that limit.

## Troubleshooting

- Check server logs and `diagnostics` for Cosmos DB failures
- Use GET `/api/diagnostics` to verify Cosmos DB connectivity
- For 429 errors, increase RU or reduce write frequency
- A 501 response from the API indicates Cosmos DB is not configured
