/**
 * Parse a dotenv-style block of `KEY=VALUE` lines into a flat map. Blank lines
 * and `#`-prefixed comments are skipped; a value wrapped in matching single or
 * double quotes has that one layer of quoting stripped.
 *
 * Used for two unrelated inputs that happen to share this shape: the
 * `extra-env` action input (a consumer-authored override block), and the
 * `.env.local` file `neon checkout` writes when there's no `neon.ts` to call
 * `fetchEnv` against.
 */
export function parseDotEnv(content: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		if (line.length === 0 || line.startsWith("#")) continue;
		const eq = line.indexOf("=");
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		if (key.length === 0) continue;
		env[key] = unquote(line.slice(eq + 1).trim());
	}
	return env;
}

function unquote(value: string): string {
	const isDoubleQuoted =
		value.length >= 2 && value.startsWith('"') && value.endsWith('"');
	const isSingleQuoted =
		value.length >= 2 && value.startsWith("'") && value.endsWith("'");
	if (isDoubleQuoted || isSingleQuoted) return value.slice(1, -1);
	return value;
}
