import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

const servers = new Map();
const subscribers = new Map();
const boardWrites = new Map();
let copilotSession;

const DEFAULT_BOARD_ID = "default";
const COLUMN_LABELS = {
    backlog: "Backlog",
    in_progress: "In progress",
    review: "Review",
    done: "Done",
};
const COLUMN_IDS = Object.keys(COLUMN_LABELS);

const boardInputSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        boardId: {
            type: "string",
            minLength: 1,
            maxLength: 80,
            description: "Stable board identifier. Defaults to 'default'.",
        },
        title: {
            type: "string",
            minLength: 1,
            maxLength: 120,
            description: "Optional board title shown in the canvas.",
        },
    },
};

const createCardSchema = {
    type: "object",
    additionalProperties: false,
    required: ["title"],
    properties: {
        boardId: { type: "string", minLength: 1, maxLength: 80 },
        title: { type: "string", minLength: 1, maxLength: 160 },
        description: { type: "string", maxLength: 2000 },
        assignee: { type: "string", maxLength: 80 },
        column: { type: "string", enum: COLUMN_IDS },
    },
};

const assignCardSchema = {
    type: "object",
    additionalProperties: false,
    required: ["cardId", "assignee"],
    properties: {
        boardId: { type: "string", minLength: 1, maxLength: 80 },
        cardId: { type: "string", minLength: 1, maxLength: 80 },
        assignee: { type: "string", minLength: 1, maxLength: 80 },
    },
};

const moveCardSchema = {
    type: "object",
    additionalProperties: false,
    required: ["cardId", "column"],
    properties: {
        boardId: { type: "string", minLength: 1, maxLength: 80 },
        cardId: { type: "string", minLength: 1, maxLength: 80 },
        column: { type: "string", enum: COLUMN_IDS },
    },
};

function nowIso() {
    return new Date().toISOString();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function boardIdFrom(input) {
    return explicitBoardIdFrom(input) || DEFAULT_BOARD_ID;
}

function explicitBoardIdFrom(input) {
    return typeof input?.boardId === "string" && input.boardId.trim() ? input.boardId.trim() : undefined;
}

function resolveBoardId(ctx) {
    return explicitBoardIdFrom(ctx.input) || servers.get(ctx.instanceId)?.boardId || DEFAULT_BOARD_ID;
}

function boardTitleFrom(input, boardId) {
    return typeof input?.title === "string" && input.title.trim() ? input.title.trim() : `Agent Kanban: ${boardId}`;
}

function resolveBoardTitle(ctx, boardId) {
    return typeof ctx.input?.title === "string" && ctx.input.title.trim()
        ? ctx.input.title.trim()
        : servers.get(ctx.instanceId)?.title || boardTitleFrom(ctx.input, boardId);
}

function sanitizeBoardId(boardId) {
    const normalized = boardId.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80);
    return normalized || DEFAULT_BOARD_ID;
}

function workspacePath() {
    return copilotSession?.workspacePath || process.cwd();
}

async function boardPath(boardId) {
    const root = path.join(workspacePath(), ".copilot-agent-kanban", "boards");
    await mkdir(root, { recursive: true });
    return path.join(root, `${sanitizeBoardId(boardId)}.json`);
}

function defaultBoard(boardId, title) {
    const timestamp = nowIso();
    return {
        boardId,
        title,
        columns: COLUMN_IDS.map((id) => ({ id, title: COLUMN_LABELS[id] })),
        cards: [],
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

async function loadBoard(boardId, title) {
    const filePath = await boardPath(boardId);
    try {
        const content = await readFile(filePath, "utf8");
        const board = JSON.parse(content);
        return {
            ...defaultBoard(boardId, title),
            ...board,
            boardId,
            title: board.title || title,
            columns: COLUMN_IDS.map((id) => ({ id, title: COLUMN_LABELS[id] })),
            cards: Array.isArray(board.cards) ? board.cards : [],
        };
    } catch (error) {
        if (error && error.code === "ENOENT") {
            const board = defaultBoard(boardId, title);
            await saveBoard(board);
            return board;
        }
        throw error;
    }
}

async function saveBoard(board) {
    const filePath = await boardPath(board.boardId);
    await writeFile(filePath, `${JSON.stringify({ ...board, updatedAt: nowIso() }, null, 2)}\n`, "utf8");
}

async function updateBoard(boardId, title, updater) {
    const previousWrite = boardWrites.get(boardId) || Promise.resolve();
    const currentWrite = previousWrite.catch(() => undefined).then(async () => {
        const board = await loadBoard(boardId, title);
        const result = await updater(board);
        board.updatedAt = nowIso();
        await saveBoard(board);
        broadcast(boardId, { type: "board-updated", board });
        return result ?? board;
    });
    boardWrites.set(boardId, currentWrite);
    try {
        return await currentWrite;
    } finally {
        if (boardWrites.get(boardId) === currentWrite) {
            boardWrites.delete(boardId);
        }
    }
}

function findCard(board, cardId) {
    const card = board.cards.find((item) => item.id === cardId);
    if (!card) {
        throw new CanvasError("card_not_found", `Card '${cardId}' was not found.`);
    }
    return card;
}

function broadcast(boardId, payload) {
    const listeners = subscribers.get(boardId);
    if (!listeners) {
        return;
    }
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of listeners) {
        res.write(data);
    }
}

async function createCard(ctx) {
    const boardId = resolveBoardId(ctx);
    const title = resolveBoardTitle(ctx, boardId);
    const card = {
        id: randomUUID().slice(0, 8),
        title: ctx.input.title.trim(),
        description: typeof ctx.input.description === "string" ? ctx.input.description.trim() : "",
        assignee: typeof ctx.input.assignee === "string" ? ctx.input.assignee.trim() : "",
        column: COLUMN_IDS.includes(ctx.input.column) ? ctx.input.column : "backlog",
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };
    await updateBoard(boardId, title, (board) => {
        board.cards.push(card);
    });
    return { card, boardId };
}

async function assignCard(ctx) {
    const boardId = resolveBoardId(ctx);
    const title = resolveBoardTitle(ctx, boardId);
    let updated;
    await updateBoard(boardId, title, (board) => {
        updated = findCard(board, ctx.input.cardId);
        updated.assignee = ctx.input.assignee.trim();
        updated.updatedAt = nowIso();
    });
    return { card: updated, boardId };
}

async function moveCard(ctx) {
    const boardId = resolveBoardId(ctx);
    const title = resolveBoardTitle(ctx, boardId);
    let updated;
    await updateBoard(boardId, title, (board) => {
        updated = findCard(board, ctx.input.cardId);
        updated.column = ctx.input.column;
        updated.updatedAt = nowIso();
    });
    return { card: updated, boardId };
}

function renderHtml(instanceId, boardId, title) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
        :root {
            color-scheme: light dark;
        }
        body {
            margin: 0;
            background: var(--background-color-default, #ffffff);
            color: var(--text-color-default, #1f2328);
            font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
            font-size: var(--text-body-medium, 14px);
            line-height: var(--leading-body-medium, 20px);
        }
        header {
            border-bottom: 1px solid var(--border-color-default, #d0d7de);
            padding: 16px 20px;
        }
        h1 {
            font-size: var(--text-title-large, 24px);
            line-height: var(--leading-title-large, 30px);
            margin: 0;
        }
        .muted {
            color: var(--text-color-muted, #656d76);
            margin: 4px 0 0;
        }
        main {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 16px;
        }
        form {
            align-items: end;
            border: 1px solid var(--border-color-default, #d0d7de);
            border-radius: 12px;
            display: grid;
            gap: 12px;
            grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(140px, 0.6fr) minmax(140px, 0.5fr) auto;
            padding: 12px;
        }
        label {
            display: grid;
            gap: 6px;
            font-weight: var(--font-weight-semibold, 600);
        }
        input, select, textarea, button {
            border: 1px solid var(--border-color-default, #d0d7de);
            border-radius: 8px;
            color: var(--text-color-default, #1f2328);
            font: inherit;
            padding: 8px 10px;
        }
        input, select, textarea {
            background: var(--background-color-default, #ffffff);
        }
        button {
            background: var(--true-color-blue, #0969da);
            border-color: var(--true-color-blue, #0969da);
            color: var(--color-white, #ffffff);
            cursor: pointer;
            font-weight: var(--font-weight-semibold, 600);
        }
        .board {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(4, minmax(220px, 1fr));
            min-height: 360px;
            overflow-x: auto;
        }
        .column {
            background: color-mix(in srgb, var(--background-color-default, #ffffff) 92%, var(--text-color-muted, #656d76));
            border: 1px solid var(--border-color-default, #d0d7de);
            border-radius: 12px;
            padding: 10px;
        }
        .column h2 {
            display: flex;
            font-size: 14px;
            justify-content: space-between;
            margin: 0 0 10px;
        }
        .card {
            background: var(--background-color-default, #ffffff);
            border: 1px solid var(--border-color-default, #d0d7de);
            border-radius: 10px;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            display: grid;
            gap: 8px;
            margin-bottom: 10px;
            padding: 10px;
        }
        .card-title {
            font-weight: var(--font-weight-semibold, 600);
        }
        .card-id {
            color: var(--text-color-muted, #656d76);
            font-family: var(--font-mono, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
            font-size: var(--text-code-inline, 12px);
        }
        .card-actions {
            display: grid;
            gap: 6px;
            grid-template-columns: 1fr;
        }
        .card-actions button {
            background: transparent;
            color: var(--text-color-default, #1f2328);
        }
        .empty {
            border: 1px dashed var(--border-color-default, #d0d7de);
            border-radius: 10px;
            color: var(--text-color-muted, #656d76);
            padding: 12px;
            text-align: center;
        }
        @media (max-width: 1000px) {
            form {
                grid-template-columns: 1fr;
            }
            .board {
                grid-template-columns: repeat(4, minmax(260px, 80vw));
            }
        }
    </style>
</head>
<body>
    <header>
        <h1>${escapeHtml(title)}</h1>
        <p class="muted">Board ID: <code>${escapeHtml(boardId)}</code> · Instance: <code>${escapeHtml(instanceId)}</code></p>
    </header>
    <main>
        <form id="create-card-form">
            <label>Title <input name="title" required maxlength="160" /></label>
            <label>Description <textarea name="description" rows="1" maxlength="2000"></textarea></label>
            <label>Assignee <input name="assignee" maxlength="80" /></label>
            <label>Column
                <select name="column">
                    ${COLUMN_IDS.map((id) => `<option value="${id}">${escapeHtml(COLUMN_LABELS[id])}</option>`).join("")}
                </select>
            </label>
            <button type="submit">Create card</button>
        </form>
        <section class="board" id="board" aria-live="polite"></section>
    </main>
    <script>
        const boardId = ${JSON.stringify(boardId)};
        const columns = ${JSON.stringify(COLUMN_IDS.map((id) => ({ id, title: COLUMN_LABELS[id] })))};

        async function request(path, options = {}) {
            const response = await fetch(path, {
                headers: { "Content-Type": "application/json", ...(options.headers || {}) },
                ...options,
            });
            if (!response.ok) {
                throw new Error(await response.text());
            }
            return response.json();
        }

        function htmlEscape(value) {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#39;");
        }

        function render(board) {
            const root = document.getElementById("board");
            root.innerHTML = columns.map((column) => {
                const cards = board.cards.filter((card) => card.column === column.id);
                return \`
                    <article class="column">
                        <h2><span>\${htmlEscape(column.title)}</span><span>\${cards.length}</span></h2>
                        \${cards.length ? cards.map(renderCard).join("") : '<div class="empty">No cards</div>'}
                    </article>
                \`;
            }).join("");
            root.querySelectorAll("[data-move]").forEach((button) => {
                button.addEventListener("click", async () => {
                    await request("/api/move-card", {
                        method: "POST",
                        body: JSON.stringify({ cardId: button.dataset.cardId, column: button.dataset.move }),
                    });
                    await refresh();
                });
            });
        }

        function renderCard(card) {
            const otherColumns = columns.filter((column) => column.id !== card.column);
            return \`
                <section class="card">
                    <div class="card-title">\${htmlEscape(card.title)}</div>
                    <div class="card-id">#\${htmlEscape(card.id)}</div>
                    \${card.description ? \`<div>\${htmlEscape(card.description)}</div>\` : ""}
                    <div class="muted">Assignee: \${htmlEscape(card.assignee || "Unassigned")}</div>
                    <div class="card-actions">
                        \${otherColumns.map((column) => \`<button type="button" data-card-id="\${htmlEscape(card.id)}" data-move="\${htmlEscape(column.id)}">Move to \${htmlEscape(column.title)}</button>\`).join("")}
                    </div>
                </section>
            \`;
        }

        async function refresh() {
            const board = await request("/api/board");
            render(board);
        }

        document.getElementById("create-card-form").addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await request("/api/create-card", {
                method: "POST",
                body: JSON.stringify(Object.fromEntries(form.entries())),
            });
            event.currentTarget.reset();
            await refresh();
        });

        const events = new EventSource("/events");
        events.onmessage = (event) => {
            const payload = JSON.parse(event.data);
            if (payload.type === "board-updated") {
                render(payload.board);
            }
        };
        refresh();
    </script>
</body>
</html>`;
}

async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}

function sendError(res, error) {
    const status = error instanceof CanvasError ? 400 : 500;
    sendJson(res, status, { error: error.message });
}

async function startServer(instanceId, boardId, title) {
    const server = createServer(async (req, res) => {
        try {
            const url = new URL(req.url || "/", "http://127.0.0.1");

            if (req.method === "GET" && url.pathname === "/") {
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.end(renderHtml(instanceId, boardId, title));
                return;
            }

            if (req.method === "GET" && url.pathname === "/api/board") {
                sendJson(res, 200, await loadBoard(boardId, title));
                return;
            }

            if (req.method === "GET" && url.pathname === "/events") {
                res.writeHead(200, {
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                    "Content-Type": "text/event-stream",
                });
                res.write("\n");
                const listeners = subscribers.get(boardId) || new Set();
                listeners.add(res);
                subscribers.set(boardId, listeners);
                req.on("close", () => {
                    listeners.delete(res);
                    if (listeners.size === 0) {
                        subscribers.delete(boardId);
                    }
                });
                return;
            }

            if (req.method === "POST" && url.pathname === "/api/create-card") {
                const input = await readJson(req);
                const result = await createCard({ instanceId, input: { ...input, boardId } });
                sendJson(res, 201, result);
                return;
            }

            if (req.method === "POST" && url.pathname === "/api/move-card") {
                const input = await readJson(req);
                const result = await moveCard({ instanceId, input: { ...input, boardId } });
                sendJson(res, 200, result);
                return;
            }

            sendJson(res, 404, { error: "Not found" });
        } catch (error) {
            sendError(res, error);
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { boardId, server, title, url: `http://127.0.0.1:${port}/` };
}

copilotSession = await joinSession({
    canvases: [
        createCanvas({
            id: "agent-kanban",
            displayName: "Agent Kanban",
            description: "Agentic Kanban board with actions to create, assign, and move cards.",
            inputSchema: boardInputSchema,
            actions: [
                {
                    name: "create_card",
                    description: "Create a card on the Kanban board.",
                    inputSchema: createCardSchema,
                    handler: createCard,
                },
                {
                    name: "assign_card",
                    description: "Assign an existing Kanban card to a person.",
                    inputSchema: assignCardSchema,
                    handler: assignCard,
                },
                {
                    name: "move_card",
                    description: "Move an existing Kanban card to another column.",
                    inputSchema: moveCardSchema,
                    handler: moveCard,
                },
            ],
            open: async (ctx) => {
                const boardId = boardIdFrom(ctx.input);
                const title = boardTitleFrom(ctx.input, boardId);
                await loadBoard(boardId, title);
                let entry = servers.get(ctx.instanceId);
                if (!entry || entry.boardId !== boardId) {
                    if (entry) {
                        await new Promise((resolve) => entry.server.close(() => resolve()));
                    }
                    entry = await startServer(ctx.instanceId, boardId, title);
                    servers.set(ctx.instanceId, entry);
                }
                return {
                    status: boardId,
                    title,
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },
        }),
    ],
});
