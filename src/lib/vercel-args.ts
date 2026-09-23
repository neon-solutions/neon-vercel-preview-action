/**
 * Build `vercel deploy` runtime-env flags (`-e KEY=VALUE ...`) for an env map.
 *
 * There is deliberately no build-time (`-b`) counterpart here: `-b` only affects a build
 * Vercel itself runs, and this action always deploys with `--prebuilt` (the build already
 * ran locally, via `vercel build`). Build-time values have to reach that earlier `vercel
 * build` invocation as real process env, not as a flag on the later `deploy` call — passing
 * `-b` to a `--prebuilt` deploy is silently a no-op.
 */
export function buildVercelRuntimeEnvFlags(env: Record<string, string>): string[] {
	const flags: string[] = [];
	for (const [key, value] of Object.entries(env)) {
		flags.push("-e", `${key}=${value}`);
	}
	return flags;
}

/**
 * The `--prod` / `--target=<env>` flag `vercel build` and `vercel deploy` both need to
 * match the requested environment. `"preview"` needs no flag (the default for both
 * commands); `"production"` is `--prod`, not `--target=production`; anything else is a
 * named custom environment via `--target`.
 */
export function vercelTargetFlags(environment: string): string[] {
	if (environment === "preview") return [];
	if (environment === "production") return ["--prod"];
	return [`--target=${environment}`];
}
