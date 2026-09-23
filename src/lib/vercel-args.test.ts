import { describe, expect, test } from "vitest";
import { buildVercelRuntimeEnvFlags, vercelTargetFlags } from "./vercel-args.js";

describe("buildVercelRuntimeEnvFlags", () => {
	test("emits one -e flag per key, in insertion order", () => {
		expect(buildVercelRuntimeEnvFlags({ A: "1", B: "2" })).toEqual([
			"-e",
			"A=1",
			"-e",
			"B=2",
		]);
	});

	test("an empty map yields no flags", () => {
		expect(buildVercelRuntimeEnvFlags({})).toEqual([]);
	});

	test("a value containing '=' is passed through unsplit", () => {
		expect(
			buildVercelRuntimeEnvFlags({ DATABASE_URL: "postgres://h/db?a=b" }),
		).toEqual(["-e", "DATABASE_URL=postgres://h/db?a=b"]);
	});
});

describe("vercelTargetFlags", () => {
	test("preview needs no flag", () => {
		expect(vercelTargetFlags("preview")).toEqual([]);
	});

	test("production is --prod, not --target=production", () => {
		expect(vercelTargetFlags("production")).toEqual(["--prod"]);
	});

	test("any other environment is a --target flag", () => {
		expect(vercelTargetFlags("staging")).toEqual(["--target=staging"]);
	});
});
