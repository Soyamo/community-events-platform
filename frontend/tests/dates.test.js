import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { toLocalInput } from "../src/utils/dates.js";

process.env.TZ = "Africa/Johannesburg";

test("offset-free API dates retain their local wall time", () => {
  assert.equal(toLocalInput("2030-01-15T10:30:00"), "2030-01-15T10:30");
});

test("UTC dates use the same local time as card dates", () => {
  assert.equal(toLocalInput("2030-01-15T08:30:00Z"), "2030-01-15T10:30");
});

test("explicit offsets are converted to local time", () => {
  assert.equal(toLocalInput("2030-01-15T03:30:00-05:00"), "2030-01-15T10:30");
});
