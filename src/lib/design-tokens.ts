// Reads src/styles/tokens.css (the single token source) into groups for /dev/tokens and the tests.

export type Token = {
  name: string;
  value: string;
  description: string;
  source: string;
};
export type TokenGroup = { title: string; tokens: Token[] };

const GROUP = /\/\*\s*@group\s+(.+?)\s*\*\//;
const TOKEN = /^\s*(--[a-z0-9-]+)\s*:\s*(.+?);\s*(?:\/\*\s*(.+?)\s*\*\/)?\s*$/;

export function parseTokens(css: string): TokenGroup[] {
  const groups: TokenGroup[] = [];
  for (const line of css.split("\n")) {
    const group = GROUP.exec(line);
    if (group) {
      groups.push({ title: group[1], tokens: [] });
      continue;
    }
    const token = TOKEN.exec(line);
    if (token && groups.length > 0) {
      const [description, source = ""] = (token[3] ?? "").split(" · ");
      groups.at(-1)!.tokens.push({
        name: token[1],
        value: token[2],
        description: description ?? "",
        source,
      });
    }
  }
  return groups;
}

export function tokenMap(groups: TokenGroup[]): Map<string, string> {
  return new Map(
    groups.flatMap((g) => g.tokens.map((t) => [t.name, t.value] as const)),
  );
}
