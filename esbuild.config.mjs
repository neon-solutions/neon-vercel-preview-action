import { build } from "esbuild";

// Bundle everything (including @actions/core) into a single dist/index.js so consumers
// never run `npm install` for this action — matches Neon's own single-purpose GitHub
// Actions (create-branch-action, delete-branch-action, ...).
// CJS output, despite the ESM source: esbuild's ESM bundles shim `require()` for any
// CJS dependency that calls it directly (here, @actions/core's http-proxy-agent chain),
// and that shim doesn't support requiring Node builtins. CJS avoids the shim entirely.
// `.cjs` (not `.js`) so Node treats it as CommonJS regardless of this package's own
// `"type": "module"`.
await build({
	entryPoints: ["src/index.ts"],
	bundle: true,
	platform: "node",
	target: "node24",
	format: "cjs",
	outfile: "dist/index.cjs",
});
