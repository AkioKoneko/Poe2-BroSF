import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function decodeHtml(value: string): string {
  return value
    .replace(/<span class=["']ndash["']>.*?<\/span>/g, "\u2014")
    .replace(/&nbsp;/g, " ")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}

function textFromHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

function matchFirst(html: string, pattern: RegExp): string {
  return pattern.exec(html)?.[1]?.trim() ?? "";
}

function metaContent(html: string, property: string): string {
  const pattern = new RegExp(
    `<meta\\s+property=["']${property}["']\\s+content=["']([\\s\\S]*?)["']\\s*\\/?>`,
    "i",
  );
  return decodeHtml(matchFirst(html, pattern));
}

function normalizePoe2dbUrl(input: string): string {
  const url = new URL(input);
  if (!["poe2db.tw", "www.poe2db.tw"].includes(url.hostname)) {
    throw new Error("Only poe2db.tw URLs can be synced.");
  }

  if (!url.pathname.startsWith("/us/")) {
    throw new Error("Use the English PoE2DB URL, for example https://poe2db.tw/us/Sylvans_Effigy.");
  }

  url.hash = "";
  return url.toString();
}

function parseKind(html: string): string {
  if (html.includes("UniquePopup")) return "unique";
  if (html.includes("CurrencyPopup")) return "currency";
  if (html.includes("GemPopup")) return "gem";
  if (/Tablet/i.test(html)) return "tablet";
  return "unique";
}

function parseItemPopup(html: string): string {
  return matchFirst(
    html,
    /(<div class="newItemPopup[\s\S]*?)<div class="itemboximage">/i,
  );
}

function parseNameAndBase(popup: string, ogTitle: string): {
  name: string;
  baseType: string;
} {
  const names = [...popup.matchAll(/<div class="itemName(?: typeLine)?">\s*<span class="lc">([\s\S]*?)<\/span>\s*<\/div>/g)]
    .map((match) => textFromHtml(match[1]));
  if (names[0]) return { name: names[0], baseType: names[1] || "Catalog Item" };

  const words = ogTitle.split(" ");
  return {
    name: ogTitle,
    baseType: words.slice(-2).join(" ") || "Catalog Item",
  };
}

function parseProperties(popup: string): {
  metaLines: string[];
  properties: Array<{ label: string; value: string }>;
} {
  const lines = [...popup.matchAll(/<div class="property">([\s\S]*?)<\/div>/g)]
    .map((match) => textFromHtml(match[1]))
    .filter(Boolean);

  const metaLines: string[] = [];
  const properties: Array<{ label: string; value: string }> = [];
  for (const line of lines) {
    const index = line.indexOf(":");
    if (index === -1) {
      metaLines.push(line);
      continue;
    }
    properties.push({
      label: line.slice(0, index).trim(),
      value: line.slice(index + 1).trim(),
    });
  }
  return { metaLines, properties };
}

function parseRequirements(popup: string): string[] {
  const value = matchFirst(popup, /<div class="requirements">([\s\S]*?)<\/div>/i);
  const text = textFromHtml(value);
  return text ? [text] : [];
}

function parseClassLines(popup: string, className: string): string[] {
  const pattern = new RegExp(`<div class="${className}">([\\s\\S]*?)<\\/div>`, "g");
  return [...popup.matchAll(pattern)]
    .map((match) => textFromHtml(match[1]))
    .filter(Boolean)
    .filter((line) => !/art variation/i.test(line));
}

function parseFlavourLines(popup: string): string[] {
  const value = matchFirst(popup, /<div class="FlavourText">\s*([\s\S]*?)\s*<\/div>/i);
  return textFromHtml(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDropSource(html: string): string {
  const row = matchFirst(html, /<tr><td>Limit<\/td><td>([\s\S]*?)<\/td><\/tr>/i);
  if (!row) return "";
  const droppedBy = /Dropped by/i.test(row);
  const source = textFromHtml(row).replace(/[\u300c\u300d]/g, "").replace(/Dropped by/i, "").trim();
  if (!source) return "";
  return droppedBy ? `Drops from ${source}` : source;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const body = await req.json().catch(() => null) as { url?: string } | null;
  const rawUrl = body?.url?.trim() ?? "";
  if (!rawUrl) return json({ error: "PoE2DB URL is required." }, 400);

  let url: string;
  try {
    url = normalizePoe2dbUrl(rawUrl);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid PoE2DB URL." }, 400);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "BROSF wishlist PoE2DB sync",
      "Accept": "text/html",
    },
  });

  if (!response.ok) {
    return json({ error: `PoE2DB returned HTTP ${response.status}.` }, 502);
  }

  const html = await response.text();
  const popup = parseItemPopup(html);
  if (!popup) return json({ error: "Could not find PoE2DB item block." }, 422);

  const title = metaContent(html, "og:title");
  const descriptionLines = metaContent(html, "og:description")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/art variation/i.test(line));
  const icon = metaContent(html, "og:image") || matchFirst(
    html,
    /<div class="itemboximage">[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
  );
  const { name, baseType } = parseNameAndBase(popup, title);
  const { metaLines, properties } = parseProperties(popup);
  const implicitMods = parseClassLines(popup, "implicitMod");
  const explicitMods = [
    ...implicitMods,
    ...descriptionLines,
  ];

  return json({
    sourceUrl: url,
    kind: parseKind(popup),
    name,
    baseType,
    icon,
    dropSource: parseDropSource(html),
    metaLines,
    properties,
    requirements: parseRequirements(popup),
    explicitMods,
    flavourLines: parseFlavourLines(popup),
  });
});
