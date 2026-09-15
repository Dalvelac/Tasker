// Locale-independent Unicode case conversion must match in browsers and Workers.
export function notePathKey(path: string): string {
  return path.trim().toLowerCase();
}
