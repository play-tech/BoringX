import type { BlockDef, ToolMeta } from "@/engine/types";
import { text } from "@/engine/p";
import { toolFromRecipe } from "@/components/toolFromRecipe";

function validCalendarDate(input: string): boolean {
  // Matches YYYY-MM-DD[T hour:minute(spec)(sec).[Z|offset]].
  const m = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (!m) return true;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12) return false;
  const daysInMonth = mo === 2
    ? (y % 4 === 0 && y % 100 !== 0 || y % 400 === 0 ? 29 : 28)
    : [31, 0, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d < 1 || d > daysInMonth) return false;
  if (m[4]) {
    const h = +m[4];
    const mi = +m[5];
    const s = +(m[6] ?? 0);
    if (h > 23 || mi > 59 || s > 59) return false;
  }
  return true;
}

export const meta: ToolMeta = {
  slug: "unix-timestamp", name: "Unix Timestamp", category: "Convert",
  blurb: "Converts epoch seconds or milliseconds to dates, and dates to epoch.",
  description: "Convert Unix timestamps (seconds or milliseconds) to readable dates and back. Shows UTC, a time zone of your choice, and relative time.",
  keywords: ["unix", "epoch", "timestamp", "date", "milliseconds", "time"],
  recipe: { name: "Unix Timestamp", input: "1700000000\n1700000000000\n2026-01-01T00:00:00Z\nnow", steps: [{ b: "timestamp", p: { tz: "UTC" } }] },
};

function relative(ms: number): string {
  const d = ms - Date.now(); const a = Math.abs(d);
  const u: [number, string][] = [[31557600000, "year"], [2629800000, "month"], [86400000, "day"], [3600000, "hour"], [60000, "minute"], [1000, "second"]];
  for (const [n, name] of u) if (a >= n) { const v = Math.round(a / n); return d < 0 ? `${v} ${name}${v > 1 ? "s" : ""} ago` : `in ${v} ${name}${v > 1 ? "s" : ""}`; }
  return "now";
}
export function fmtInZone(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZoneName: "short" }).format(ms).replace(",", "");
}

export const blocks: BlockDef[] = [{
  id: "timestamp", name: "Unix timestamp", category: "Convert", description: "Each line: epoch to dates, or a date to epoch.",
  params: [text("tz", "Display time zone", "UTC", "IANA name, e.g. America/Halifax")],
  run: (input, p) => {
    const tz = String(p.tz) || "UTC";
    try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch { throw new Error(`"${tz}" is not a time zone. Use an IANA name like Europe/Paris or UTC.`); }
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) throw new Error("Enter a timestamp or a date, one per line.");
    return lines.map((l) => {
      let ms: number;
      if (l.toLowerCase() === "now") ms = Date.now();
      else if (/^-?\d+(\.\d+)?$/.test(l)) { const n = Number(l); ms = Math.abs(n) >= 1e11 ? n : n * 1000; }
      else {
        if (!validCalendarDate(l)) return `${l}\n  Could not read this as a date. Use ISO format like 2026-01-31T09:30:00Z.`;
        ms = Date.parse(l);
        if (Number.isNaN(ms)) return `${l}\n  Could not read this as a date. Use ISO format like 2026-01-31T09:30:00Z.`;
      }
      if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) return `${l}\n  Out of range.`;
      return [`${l}`, `  seconds:  ${Math.floor(ms / 1000)}`, `  millis:   ${Math.floor(ms)}`, `  ISO UTC:  ${new Date(ms).toISOString()}`, `  ${tz}: ${fmtInZone(ms, tz)}`, `  relative: ${relative(ms)}`].join("\n");
    }).join("\n\n");
  },
}]

export default toolFromRecipe(meta.recipe!, blocks, { inputLabel: "Timestamps or dates, one per line", outputName: "timestamps.txt", inputRows: 5 });
