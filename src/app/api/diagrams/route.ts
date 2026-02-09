import { NextResponse } from "next/server";
import type { DiagramDocument, StoredDiagramSummary } from "@/lib/types";
import { getCosmosContainer } from "@/lib/azure/cosmos";
import {
  isDiagramDocument,
  normalizeDiagramDocument,
  serializeDiagram,
} from "@/lib/diagram-serialization";
import { isRequestAuthenticated, isSimpleAuthEnabled, getSimpleAuthVirtualEmail, ANONYMOUS_VIRTUAL_EMAIL } from "@/lib/simple-auth";
import { isMsalConfigured } from "@/lib/msal-config";
import { validateMsalToken } from "@/lib/msal-validate";

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

/**
 * Extract and validate the Bearer token from the Authorization header.
 * Returns the raw token string or null.
 */
const extractBearerToken = (request: Request): string | null => {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
};

/**
 * Resolve the user email for data isolation.
 *
 * - MSAL → email extracted from a server-side validated ID token
 * - SimpleAuth → virtual email derived from USER_NAME env var
 *   (e.g. "microsoft@simple-auth.local")
 * - No auth → fixed anonymous virtual email
 *   ("anonymous@anonymous.local")
 *
 * Uses RFC 2606 reserved domains (.local) for non-MSAL cases so
 * virtual emails can never collide with real Entra ID addresses.
 */
const resolveUserEmail = async (request: Request): Promise<string> => {
  if (isMsalConfigured()) {
    const token = extractBearerToken(request);
    if (token) {
      const claims = await validateMsalToken(token);
      if (claims?.email) {
        return claims.email;
      }
    }
    return ANONYMOUS_VIRTUAL_EMAIL;
  }
  if (isSimpleAuthEnabled()) {
    return getSimpleAuthVirtualEmail() ?? ANONYMOUS_VIRTUAL_EMAIL;
  }
  return ANONYMOUS_VIRTUAL_EMAIL;
};

const enforceAuth = async (request: Request) => {
  // When MSAL is configured, validate the ID token server-side.
  // This prevents X-User-Email header spoofing attacks.
  if (isMsalConfigured()) {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required. Bearer token missing." },
        { status: 401 },
      );
    }
    const claims = await validateMsalToken(token);
    if (!claims) {
      return NextResponse.json(
        { message: "Authentication failed. Invalid or expired token." },
        { status: 401 },
      );
    }
    return null;
  }

  // Fallback: simple auth
  if (!isSimpleAuthEnabled()) return null;
  if (isRequestAuthenticated(request)) return null;
  return NextResponse.json(
    { message: "Authentication required." },
    { status: 401 },
  );
};

export async function GET(request: Request) {
  const authError = await enforceAuth(request);
  if (authError) return authError;
  const container = getCosmosContainer();
  if (!container) {
    return storageNotConfigured();
  }

  const userEmail = await resolveUserEmail(request);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (id) {
    try {
      const { resource } = await container.item(id, id).read<DiagramDocument & { userEmail?: string }>();
      if (!resource || !isDiagramDocument(resource)) {
        return NextResponse.json({ message: "Diagram not found." }, { status: 404 });
      }
      // Verify the document belongs to this user
      if (resource.userEmail !== userEmail) {
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
    // Only return diagrams belonging to this user
    const querySpec = {
      query:
        "SELECT c.id, c.name, c.updatedAt FROM c WHERE c.userEmail = @email",
      parameters: [{ name: "@email", value: userEmail }],
    };
    const { resources } = await container.items
      .query<StoredDiagramSummary>(querySpec)
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
  const authError = await enforceAuth(request);
  if (authError) return authError;
  const container = getCosmosContainer();
  if (!container) {
    return storageNotConfigured();
  }

  const userEmail = await resolveUserEmail(request);

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
    // Always attach user email for data isolation
    const toStore = { ...serialized, userEmail };
    await container.items.upsert(toStore);
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
  const authError = await enforceAuth(request);
  if (authError) return authError;
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

  const userEmail = await resolveUserEmail(request);

  try {
    // Verify ownership before deleting
    const { resource } = await container.item(id, id).read<{ userEmail?: string }>();
    if (!resource || resource.userEmail !== userEmail) {
      return NextResponse.json({ message: "Diagram not found." }, { status: 404 });
    }
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
