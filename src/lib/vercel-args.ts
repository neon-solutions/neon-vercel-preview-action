/**
 * Build `vercel deploy` flags for an env map, injecting every key as both a
 * build-time (`-b`) and runtime (`-e`) variable. Both are needed for a real
 * full-stack app: a page that queries the database at build time (SSG/ISR)
 * reads the build-time value; a request handler reads the runtime one — a
 * var present in only one silently breaks the other path.
 */
export function buildVercelEnvFlags(env: Record<string, string>): string[] {
	const flags: string[] = [];
	for (const [key, value] of Object.entries(env)) {
		flags.push("-b", `${key}=${value}`, "-e", `${key}=${value}`);
	}
	return flags;
}
