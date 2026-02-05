import { NextResponse } from "next/server";
import type { DiagramDocument, StoredDiagramSummary } from "@/lib/types";
import { getCosmosContainer } from "@/lib/azure/cosmos";
import {
  isDiagramDocument,
  normalizeDiagramDocument,
  serializeDiagram,
} from "@/lib/diagram-serialization";

export const runtime = "nodejs";

const storageNotConfigured = () =>
  NextResponse.json(
    {
      message:
        "Cosmos DB is not configured. Set COSMOS_ENDPOINT, COSMOS_DATABASE, and COSMOS_CONTAINER to enable cloud storage.",
      storage: "local",
    },
    { status: 501 },
  );

const logCosmosError = (error: unknown, context: string) => {
  const err = error as {
    code?: string | number;
    message?: string;
    diagnostics?: { toString?: () => string };
  };
  console.error("Cosmos DB request failed", {
    context,
    code: err?.code,
    message: err?.message,
    diagnostics: err?.diagnostics?.toString?.(),
  });
};

export async function GET(request: Request) {
  const container = getCosmosContainer();
  if (!container) {
    return storageNotConfigured();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    try {
      const { resource } = await container.item(id, id).read<DiagramDocument>();
      if (!resource || !isDiagramDocument(resource)) {
        return NextResponse.json({ message: "Diagram not found." }, { status: 404 });
      }
      return NextResponse.json({
        document: normalizeDiagramDocument(resource),
      });
    } catch (error) {
      logCosmosError(error, "read");
      const err = error as { code?: number };
      if (err?.code === 404) {
        return NextResponse.json({ message: "Diagram not found." }, { status: 404 });
      }
      return NextResponse.json(
        { message: "Failed to load diagram." },
        { status: 500 },
      );
    }
  }

  try {
    const { resources } = await container.items
      .query<StoredDiagramSummary>(
        {
          query: "SELECT c.id, c.name, c.updatedAt FROM c",
        }
      )
      .fetchAll();
    const items = (resources ?? []).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return NextResponse.json({ items });
  } catch (error) {
    logCosmosError(error, "list");
    return NextResponse.json(
      { message: "Failed to list diagrams." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const container = getCosmosContainer();
  if (!container) {
    return storageNotConfigured();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse diagram payload", error);
    return NextResponse.json(
      { message: "Invalid request payload." },
      { status: 400 },
    );
  }

  const document = (payload as { document?: DiagramDocument })?.document ?? payload;
  if (!isDiagramDocument(document)) {
    return NextResponse.json(
      { message: "Invalid diagram payload." },
      { status: 400 },
    );
  }

  try {
    const serialized = serializeDiagram(document);
    await container.items.upsert(serialized);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logCosmosError(error, "upsert");
    return NextResponse.json(
      { message: "Failed to save diagram." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const container = getCosmosContainer();
  if (!container) {
    return storageNotConfigured();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { message: "Missing diagram id." },
      { status: 400 },
    );
  }

  try {
    await container.item(id, id).delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    logCosmosError(error, "delete");
    const err = error as { code?: number };
    if (err?.code === 404) {
      return NextResponse.json({ message: "Diagram not found." }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Failed to delete diagram." },
      { status: 500 },
    );
  }
}
