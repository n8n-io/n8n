import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { logs } from './process';
import type { RigStack } from './stack';

/** The part of a stack a scenario uses. */
export type ScenarioStack = Pick<RigStack, 'n8nContainers' | 'stop'>;

export interface ScenarioTestInfo {
	attach(name: string, options: { body: string; contentType: string }): Promise<void>;
}

export type Variant = 'before' | 'after';

export const variant = (): Variant =>
	process.env.TEST_RIG_VARIANT === 'before' ? 'before' : 'after';

export interface Expectation {
	describe: string;
	test: (actual: unknown) => boolean;
}

export const is = (expected: unknown): Expectation => ({
	describe: `is ${JSON.stringify(expected)}`,
	test: (actual) => isDeepStrictEqual(actual, expected),
});

export const isNot = (unexpected: unknown): Expectation => ({
	describe: `is not ${JSON.stringify(unexpected)}`,
	test: (actual) => !isDeepStrictEqual(actual, unexpected),
});

export const below = (limit: number): Expectation => ({
	describe: `is below ${limit}`,
	test: (actual) => typeof actual === 'number' && actual < limit,
});

/** The value is an array or string that contains `item`. */
export const includes = (item: unknown): Expectation => ({
	describe: `includes ${JSON.stringify(item)}`,
	test: (actual) =>
		(Array.isArray(actual) && actual.some((value) => isDeepStrictEqual(value, item))) ||
		(typeof actual === 'string' && typeof item === 'string' && actual.includes(item)),
});

export const anything: Expectation = { describe: 'is anything', test: () => true };

/** One named check: a label, the observed value and what it should be. */
export type Check = [label: string, actual: unknown, expected: Expectation];

export interface VariantChecks {
	before?: Check[];
	after?: Check[];
	/** Checks for both variants. */
	always?: Check[];
}

/** Returns a line for every failed check, so a test can assert the list is empty. */
export function failedChecks(checks: Check[]): string[] {
	return checks
		.filter(([, actual, expected]) => !expected.test(actual))
		.map(
			([label, actual, expected]) =>
				`${label}: ${JSON.stringify(actual) ?? 'undefined'} ${expected.describe}`,
		);
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export class Scenario {
	readonly variant: Variant = variant();

	readonly result: Record<string, unknown>;

	private readonly started = Date.now();

	private readonly timeline: Array<{ step: string; ms: number; note?: unknown }> = [];

	constructor(
		readonly name: string,
		readonly rig: ScenarioStack,
		private readonly outputDir: string,
	) {
		this.result = {
			scenario: name,
			variant: this.variant,
			image: process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:local',
		};
	}

	mark(step: string, note?: unknown) {
		this.timeline.push({ step, ms: Date.now() - this.started, note });
	}

	async step<T>(label: string, action: () => Promise<T>): Promise<T> {
		const value = await action();
		this.mark(label);
		return value;
	}

	/** Resolves with the key of the first promise that settles successfully. */
	async race<K extends string>(label: string, entries: Record<K, Promise<unknown>>): Promise<K> {
		const winner = await Promise.any(
			(Object.entries(entries) as Array<[K, Promise<unknown>]>).map(async ([key, promise]) => {
				await promise;
				return key;
			}),
		);
		this.mark(label, winner);
		return winner;
	}

	set(values: Record<string, unknown>) {
		Object.assign(this.result, values);
	}

	/** Runs the checks for this variant, records the failures and returns them. */
	verify(checks: VariantChecks): string[] {
		const failed = failedChecks([...(checks.always ?? []), ...(checks[this.variant] ?? [])]);
		this.result.failedChecks = failed;
		return failed;
	}

	/** Writes every n8n container log to the output dir and returns them by name. */
	async collectLogs(): Promise<Record<string, string>> {
		const out: Record<string, string> = {};
		const dir = join(this.outputDir, 'logs');
		mkdirSync(dir, { recursive: true });
		for (const { name, container } of this.rig.n8nContainers()) {
			try {
				out[name] = await logs(container);
				writeFileSync(join(dir, `${name}.log`), out[name]);
			} catch {
				out[name] = '';
			}
		}
		return out;
	}

	async run(testInfo: ScenarioTestInfo, body: () => Promise<void>) {
		const errors: unknown[] = [];
		try {
			await body();
		} catch (error) {
			errors.push(error);
			this.result.error = message(error);
			await this.collectLogs().catch(() => undefined);
		}
		try {
			await this.rig.stop();
		} catch (error) {
			errors.push(error);
			this.result.stopError = message(error);
		}
		const failed = (this.result.failedChecks as string[] | undefined) ?? [];
		if (errors.length === 0 && failed.length > 0)
			errors.push(new Error(`failed checks: ${failed.join('; ')}`));
		this.result.scenarioMs = Date.now() - this.started;
		this.result.timeline = this.timeline;
		await testInfo.attach('scenario', {
			body: JSON.stringify(this.result, null, 2),
			contentType: 'application/json',
		});
		if (errors.length > 0) throw errors[0];
	}
}
