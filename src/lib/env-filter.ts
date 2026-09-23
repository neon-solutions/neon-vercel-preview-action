/**
 * Parse a newline-separated list of env-var names (the `neon-env-keys` action input).
 * Blank lines and `#`-prefixed comments are skipped; each remaining line is trimmed and
 * used as a literal key — no globbing, no prefix matching, so a typo silently excludes a
 * key rather than silently including too much.
 */
export function parseKeyList(content: string): string[] {
	return content
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Restrict `env` to the given `keys` (a selection of what Neon sourced, e.g. "only the
 * Object Storage vars, not the AI Gateway ones"). An empty or undefined `keys` list means
 * "no filter" — every Neon-sourced var passes through, which is the default when
 * `neon-env-keys` isn't set.
 *
 * A listed key that Neon didn't actually set is silently absent from the result, not an
 * error — the same "naming an unavailable var yields nothing" behavior `@neon/env`'s own
 * `fetchEnv`/`parseEnv` `keys` selection has.
 */
export function filterEnvKeys(
	env: Record<string, string>,
	keys: string[] | undefined,
): Record<string, string> {
	if (!keys || keys.length === 0) return env;
	const allowed = new Set(keys);
	const filtered: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (allowed.has(key)) filtered[key] = value;
	}
	return filtered;
}
