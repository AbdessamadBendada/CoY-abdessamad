// Whitelist: <p>, <strong>, <br>, <a href="https?://"> — aligned with action-generation.ts prompt
// Neutralizes non-whitelisted tags regardless of source (tenantName, customerName, LLM hallucination)
// No npm dependencies — compatible with Edge Runtime and Node.js

const ALLOWED_A_HREF = /^https?:\/\//i;

export function sanitizeEmailHtml(html: string): string {
  // Neutralize unterminated tags (LLM truncated by max_tokens)
  const closed = html.replace(/<[^>]*$/, "");

  return closed.replace(/<[^>]*>/g, (tag) => {
    // Closing tags
    if (/^<\/(p|strong|a)>$/i.test(tag)) return tag;

    // <br> all variants → normalize to <br>
    if (/^<br\b/i.test(tag)) return "<br>";

    // <p> and <strong> — reconstruct WITHOUT any attribute (closes style/class/data-* and on* handlers)
    if (/^<(p|strong)\b/i.test(tag)) {
      const name = tag.match(/^<(p|strong)\b/i)![1].toLowerCase();
      return `<${name}>`;
    }

    // <a href> — allow only https?://, extract href from single OR double quotes
    if (/^<a\b/i.test(tag)) {
      const match = tag.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const hrefValue = match?.[1] ?? match?.[2] ?? "";
      if (!ALLOWED_A_HREF.test(hrefValue)) return "<a>";
      // Re-escape double quotes in href value (prevents attribute re-injection)
      const safeHref = hrefValue.replace(/"/g, "&quot;");
      return `<a href="${safeHref}">`;
    }

    // All other tags (<img>, <script>, <style>, <div>, <ul>, <em>, <b>...) → removed
    return "";
  });
}
