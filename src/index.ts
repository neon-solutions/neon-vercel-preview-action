import * as core from "@actions/core";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseDotEnv } from "./lib/dotenv.js";
import { filterEnvKeys, parseKeyList } from "./lib/env-filter.js";
import { buildVercelRuntimeEnvFlags, vercelTargetFlags } from "./lib/vercel-args.js";

/**
 * `neon checkout` writes the branch's env here by default — everything the branch's
 * neon.ts declares (Postgres, S3 storage credentials, and any other enabled service), or
 * just Postgres when there's no neon.ts at all. Reading this file, rather than calling
 * `fetchEnv` ourselves, means this action never has to load the consumer's neon.ts
 * directly — `neon checkout` already did that internally.
 */
const NEON_ENV_FILE_CANDIDATES = [".env.local", ".env"];

async function main(): Promise<void> {
	const neonApiKey = core.getInput("neon-api-key", { required: true });
	const projectId = core.getInput("neon-project-id", { required: true });
	const vercelToken = core.getInput("vercel-token", { required: true });
	const vercelEnvironment = core.getInput("vercel-environment") || "preview";
	const neonEnvKeys = parseKeyList(core.getInput("neon-env-keys"));
	const extraEnv = parseDotEnv(core.getInput("extra-env"));
	const cwd = resolve(process.cwd(), core.getInput("working-directory") || ".");
	const branchName = core.getInput("neon-branch-name") || defaultBranchName();
	const targetFlags = vercelTargetFlags(vercelEnvironment);

	core.info("Installing neon and vercel CLIs");
	runStreaming("npm", ["install", "--global", "neon@latest", "vercel@latest"], cwd, {});

	core.info(`Creating/reconciling Neon branch "${branchName}"`);
	// No --allow-protected: this action only ever targets a preview branch it names itself,
	// so a collision with a protected branch (e.g. a misconfigured neon-branch-name input)
	// should fail loudly rather than be waved through.
	runStreaming(
		"neon",
		["checkout", branchName, "--create", "--update-existing", "--project-id", projectId],
		cwd,
		{ NEON_API_KEY: neonApiKey },
	);

	// `neon-env-keys` selects which Neon-sourced vars reach Vercel at all (e.g. "Object
	// Storage, not AI Gateway"); unset means every var Neon wrote passes through. Neon's
	// (filtered) values come first so `extra-env` can override any of them, or add keys
	// Neon doesn't set at all.
	const mergedEnv = {
		...filterEnvKeys(readNeonEnvFile(cwd), neonEnvKeys),
		...extraEnv,
	};

	core.info(`Building and deploying to Vercel (${vercelEnvironment})`);
	runStreaming(
		"vercel",
		["pull", "--yes", `--environment=${vercelEnvironment}`, "--token", vercelToken],
		cwd,
		{},
	);
	// The build step is what actually consumes build-time values (an SSG/ISR page querying
	// the database, say) — they have to be real env vars on *this* process, not a flag on
	// the later `deploy --prebuilt` call, which no longer runs a build at all.
	runStreaming(
		"vercel",
		["build", "--token", vercelToken, ...targetFlags],
		cwd,
		mergedEnv,
	);
	// `vercel deploy`'s stdout is documented to always be the deployment URL; stderr (build
	// logs) still streams live so a failure is visible without needing --logs. `-e` here is
	// the runtime env for the deployed functions — independent from what the build step read.
	const deploymentUrl = runCapturingStdout(
		"vercel",
		[
			"deploy",
			"--prebuilt",
			"--token",
			vercelToken,
			...targetFlags,
			...buildVercelRuntimeEnvFlags(mergedEnv),
		],
		cwd,
		{},
	).trim();

	core.setOutput("neon-branch-name", branchName);
	core.setOutput("deployment-url", deploymentUrl);
	core.info(`Deployed: ${deploymentUrl}`);
}

/** `preview/<git ref>` — the same convention Neon's own Vercel/GitHub integrations use. */
function defaultBranchName(): string {
	const ref = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
	if (!ref) {
		throw new Error(
			"Could not derive a branch name from GITHUB_HEAD_REF / GITHUB_REF_NAME. " +
				"Pass the neon-branch-name input explicitly.",
		);
	}
	return `preview/${ref}`;
}

function readNeonEnvFile(cwd: string): Record<string, string> {
	for (const filename of NEON_ENV_FILE_CANDIDATES) {
		const path = resolve(cwd, filename);
		if (existsSync(path)) return parseDotEnv(readFileSync(path, "utf-8"));
	}
	throw new Error(
		`Expected neon checkout to write one of ${NEON_ENV_FILE_CANDIDATES.join(", ")}, found neither.`,
	);
}

/** Run a command with both stdout and stderr streamed live to the job log. */
function runStreaming(
	cmd: string,
	args: string[],
	cwd: string,
	env: Record<string, string>,
): void {
	execFileSync(cmd, args, {
		cwd,
		env: { ...process.env, ...env },
		stdio: "inherit",
	});
}

/** Run a command with stderr streamed live but stdout captured and returned. */
function runCapturingStdout(
	cmd: string,
	args: string[],
	cwd: string,
	env: Record<string, string>,
): string {
	return execFileSync(cmd, args, {
		cwd,
		env: { ...process.env, ...env },
		encoding: "utf-8",
		stdio: ["ignore", "pipe", "inherit"],
	});
}

main().catch((err) => {
	core.setFailed(err instanceof Error ? err.message : String(err));
});
