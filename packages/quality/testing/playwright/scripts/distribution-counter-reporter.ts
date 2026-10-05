/* eslint-disable import-x/no-default-export -- Playwright loads a default reporter export. */
import type { FullConfig, Reporter, Suite, TestCase } from '@playwright/test/reporter';
import { writeFileSync } from 'node:fs';
import { relative, sep } from 'node:path';

function workerHash(test: TestCase): string {
	const value: unknown = Reflect.get(test, '_workerHash');
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error('Playwright did not expose a worker hash for a listed test');
	}
	return value;
}

function poolDigest(test: TestCase): string {
	const value: unknown = Reflect.get(test, '_poolDigest');
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error('Playwright did not expose a fixture-pool digest for a listed test');
	}
	return value;
}

function relativeSpec(file: string): string {
	return relative(process.cwd(), file).split(sep).join('/');
}

export default class DistributionCounterReporter implements Reporter {
	onBegin(_config: FullConfig, suite: Suite): void {
		const output = process.env.DISTRIBUTION_COUNTER_OUTPUT;
		if (!output) throw new Error('DISTRIBUTION_COUNTER_OUTPUT is required');

		const tests = suite.allTests().filter((test) => test.expectedStatus !== 'skipped');
		const runnableSpecs = new Set<string>();
		const profiles = new Map<string, { poolDigest: string; specs: Set<string>; tests: number }>();

		for (const test of tests) {
			const spec = relativeSpec(test.location.file);
			runnableSpecs.add(spec);
			const hash = workerHash(test);
			const profile = profiles.get(hash) ?? {
				poolDigest: poolDigest(test),
				specs: new Set<string>(),
				tests: 0,
			};
			profile.specs.add(spec);
			profile.tests++;
			profiles.set(hash, profile);
		}

		writeFileSync(
			output,
			JSON.stringify({
				runnableTests: tests.length,
				runnableSpecs: runnableSpecs.size,
				profiles: [...profiles.entries()]
					.map(([hash, profile]) => ({
						workerHash: hash,
						poolDigest: profile.poolDigest,
						tests: profile.tests,
						specs: [...profile.specs].sort(),
					}))
					.sort((a, b) => a.workerHash.localeCompare(b.workerHash)),
			}),
		);
	}
}
