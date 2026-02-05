import { NextResponse } from "next/server";
import path from "node:path";
import { readdir } from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IconItemDto {
  id: string;
  name: string;
  src: string;
  folder: string;
}

const iconExtensions = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);

const isTruthyEnv = (value: string | undefined) => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const toDisplayName = (fileBaseName: string) => {
  const words = fileBaseName
    .replace(/[_\-]+/g, " ")
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) return fileBaseName;
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const walkIcons = async (args: {
  fsRoot: string;
  urlRoot: string;
  relDir?: string;
}): Promise<IconItemDto[]> => {
  const relDir = args.relDir ?? "";
  const fullDir = path.join(args.fsRoot, relDir);

  let entries;
  try {
    entries = await readdir(fullDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items: IconItemDto[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    if (entry.isDirectory()) {
      items.push(
        ...(await walkIcons({
          fsRoot: args.fsRoot,
          urlRoot: args.urlRoot,
          relDir: path.join(relDir, entry.name),
        })),
      );
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.toLowerCase() === ".gitkeep") {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!iconExtensions.has(ext)) {
      continue;
    }

    const relPath = path.join(relDir, entry.name);
    const relPosix = relPath.split(path.sep).join("/");
    const base = path.basename(entry.name, ext);
    const folder = path.posix.dirname(relPosix) === "." ? "" : path.posix.dirname(relPosix);

    items.push({
      id: relPosix,
      name: toDisplayName(base),
      src: `${args.urlRoot}/${relPosix}`,
      folder,
    });
  }

  return items;
};

export async function GET() {
  const includeSample = isTruthyEnv(process.env.ICONS_SAMPLE_ENABLED);

  const publicDir = path.join(process.cwd(), "public");
  const prodFsRoot = path.join(publicDir, "icons");
  const sampleFsRoot = path.join(publicDir, "icons-sample");

  const byRelPath = new Map<string, IconItemDto>();

  if (includeSample) {
    const sampleItems = await walkIcons({ fsRoot: sampleFsRoot, urlRoot: "/icons-sample" });
    for (const item of sampleItems) {
      byRelPath.set(item.id, item);
    }
  }

  const prodItems = await walkIcons({ fsRoot: prodFsRoot, urlRoot: "/icons" });
  for (const item of prodItems) {
    byRelPath.set(item.id, item);
  }

  const items = [...byRelPath.values()].sort((a, b) => {
    const folderDiff = a.folder.localeCompare(b.folder);
    if (folderDiff !== 0) return folderDiff;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(
    {
      items,
      sources: {
        prod: true,
        sample: includeSample,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
