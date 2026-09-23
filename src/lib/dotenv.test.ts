import { describe, expect, test } from "vitest";
import { parseDotEnv } from "./dotenv.js";

describe("parseDotEnv", () => {
	test("parses simple KEY=VALUE lines", () => {
		expect(parseDotEnv("A=1\nB=2")).toEqual({ A: "1", B: "2" });
	});

	test("skips blank lines and comments", () => {
		expect(parseDotEnv("\nA=1\n# a comment\n\nB=2\n")).toEqual({
			A: "1",
			B: "2",
		});
	});

	test("strips one layer of matching double or single quotes", () => {
		expect(parseDotEnv('A="hello"\nB=\'world\'')).toEqual({
			A: "hello",
			B: "world",
		});
	});

	test("leaves mismatched or partial quotes untouched", () => {
		expect(parseDotEnv('A="hello\'\nB=\'world')).toEqual({
			A: '"hello\'',
			B: "'world",
		});
	});

	test("a value can itself contain an '=' (only the first splits)", () => {
		expect(parseDotEnv("DATABASE_URL=postgres://u:p@host/db?a=b")).toEqual({
			DATABASE_URL: "postgres://u:p@host/db?a=b",
		});
	});

	test("trims whitespace around key and value", () => {
		expect(parseDotEnv("  A  =  1  ")).toEqual({ A: "1" });
	});

	test("skips a line with no '=' and a line with an empty key", () => {
		expect(parseDotEnv("not-a-line\n=novalue\nA=1")).toEqual({ A: "1" });
	});

	test("empty input yields an empty map", () => {
		expect(parseDotEnv("")).toEqual({});
	});
});
