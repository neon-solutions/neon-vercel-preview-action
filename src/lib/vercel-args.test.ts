import { describe, expect, test } from "vitest";
import { buildVercelEnvFlags } from "./vercel-args.js";

describe("buildVercelEnvFlags", () => {
	test("emits one -b and one -e flag pair per key, in insertion order", () => {
		expect(buildVercelEnvFlags({ A: "1", B: "2" })).toEqual([
			"-b",
			"A=1",
			"-e",
			"A=1",
			"-b",
			"B=2",
			"-e",
			"B=2",
		]);
	});

	test("an empty map yields no flags", () => {
		expect(buildVercelEnvFlags({})).toEqual([]);
	});

	test("a value containing '=' is passed through unsplit", () => {
		expect(buildVercelEnvFlags({ DATABASE_URL: "postgres://h/db?a=b" })).toEqual(
			["-b", "DATABASE_URL=postgres://h/db?a=b", "-e", "DATABASE_URL=postgres://h/db?a=b"],
		);
	});
});
