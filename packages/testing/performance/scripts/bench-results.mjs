/**
 * Benchmark Results
 *
 * Reads the Vitest 5 JSON reporter output. Each test case in
 * `testResults[].assertionResults[]` has a `benchmarks` array. Each entry is one
 * `bench().run()` or `bench.compare()` call, and has one task per benchmark.
 */

import { isAbsolute, relative } from 'path';

/** Vitest arguments that write the JSON report to `outputFile` and keep the console tables. */
export const jsonReporterArgs = (outputFile) => [
	'--reporter=default',
	'--reporter=json',
	`--outputFile.json=${outputFile}`,
];

/** Makes the test file paths relative to `packageDir`, so the file can be committed. */
export function sanitizePaths(results, packageDir) {
	for (const file of results.testResults ?? []) {
		if (file.name) file.name = relative(packageDir, file.name);
	}
	return results;
}

const NOT_RUN = new Set(['skipped', 'pending', 'todo', 'disabled']);

/**
 * Flattens the report into one entry per benchmark task.
 * `hz` is the mean throughput (operations per second), the `hz` column of the console table.
 * A test case that ran but did not produce a result gives an entry with `failed: true`.
 */
export function collectBenchmarks(results, packageDir) {
	const entries = [];
	for (const file of results.testResults ?? []) {
		const filePath =
			file.name && isAbsolute(file.name) ? relative(packageDir, file.name) : file.name;
		for (const testCase of file.assertionResults ?? []) {
			if (NOT_RUN.has(testCase.status)) continue;
			const benchmarks = testCase.benchmarks ?? [];
			if (testCase.status !== 'passed' || benchmarks.length === 0) {
				const fullName = [...(testCase.ancestorTitles ?? []), testCase.title].join(' > ');
				entries.push({
					key: `${filePath} > ${fullName}`,
					group: fullName,
					name: testCase.title,
					hz: undefined,
					failed: true,
				});
				continue;
			}
			for (const benchmark of benchmarks) {
				for (const task of benchmark.tasks) {
					if (task.fromStore) continue;
					const hz = task.throughput?.mean;
					entries.push({
						key: `${filePath} > ${benchmark.name}::${task.name}`,
						group: benchmark.name,
						name: task.name,
						hz,
						failed: typeof hz !== 'number' || !Number.isFinite(hz),
					});
				}
			}
		}
	}
	return entries;
}
