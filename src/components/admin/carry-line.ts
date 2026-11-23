// A conflict line that survives the refresh it asks for (§9.4): the refreshed screen opens a fresh form, which takes it.
let carried: string | null = null;

export function carryLine(line: string) {
  carried = line;
}

export function takeCarriedLine(): string | null {
  const line = carried;
  carried = null;
  return line;
}
