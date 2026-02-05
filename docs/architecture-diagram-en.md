# Architecture Diagram

[日本語](architecture-diagram.md) | English

## Overview

```mermaid
flowchart LR
  subgraph Client[Browser]
    UI[UI / Editor]
    Local[(Local Storage)]
  end

  subgraph App[Next.js App Router]
    Pages[Pages]
    API[Route Handlers\n/api/health\n/api/icons\n/api/diagrams]
  end

  subgraph Azure[Azure]
    Cosmos[(Cosmos DB)]
  end

  UI -->|User actions| Pages
  UI -->|Save/Load| API
  UI -->|Local persistence| Local
  API -->|Cosmos SDK| Cosmos
```

## Notes

- The API uses cloud persistence when Cosmos DB environment variables are configured.
- Otherwise, the client falls back to browser local storage.
