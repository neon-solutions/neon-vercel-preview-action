import { describe, expect, test } from "vitest";
import { filterEnvKeys, parseKeyList } from "./env-filter.js";

describe("parseKeyList", () => {
	test("one key per line, trimmed", () => {
		expect(parseKeyList("A\n  B  \nC")).toEqual(["A", "B", "C"]);
	});

	test("skips blank lines and comments", () => {
		expect(parseKeyList("A\n\n# a comment\nB\n")).toEqual(["A", "B"]);
	});

	test("empty input yields an empty list", () => {
		expect(parseKeyList("")).toEqual([]);
	});
});

describe("filterEnvKeys", () => {
	const env = {
		DATABASE_URL: "postgres://…",
		AWS_ACCESS_KEY_ID: "nak_…",
		AWS_SECRET_ACCESS_KEY: "secret",
		NEON_AI_GATEWAY_TOKEN: "token",
	};

	test("undefined keys: no filter, every var passes through", () => {
		expect(filterEnvKeys(env, undefined)).toEqual(env);
	});

	test("empty keys list: no filter", () => {
		expect(filterEnvKeys(env, [])).toEqual(env);
	});

	test("restricts to exactly the listed keys present in env", () => {
		expect(
			filterEnvKeys(env, ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]),
		).toEqual({
			AWS_ACCESS_KEY_ID: "nak_…",
			AWS_SECRET_ACCESS_KEY: "secret",
		});
	});

	test("a listed key Neon didn't set is silently absent, not an error", () => {
		expect(filterEnvKeys(env, ["AWS_ACCESS_KEY_ID", "NOT_SET"])).toEqual({
			AWS_ACCESS_KEY_ID: "nak_…",
		});
	});

	test("a fully non-matching list yields an empty map", () => {
		expect(filterEnvKeys(env, ["NOT_SET"])).toEqual({});
	});
});
