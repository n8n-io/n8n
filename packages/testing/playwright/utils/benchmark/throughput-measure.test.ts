import { describe, expect, test } from 'vitest';

import {
	measureCounterWindow,
	measureStageWindows,
	measureSteadyPhases,
	type ThroughputSample,
} from './throughput-measure';

function sample(timestamp: number, completed: number, delta: number): ThroughputSample {
	return { timestamp, completed, delta };
}

describe('measureCounterWindow', () => {
	test('measures a counter from actual sample timestamps', () => {
		const samples = Array.from({ length: 16 }, (_, index) =>
			sample(index * 2_000, index * 20, index === 0 ? 0 : 20),
		);

		expect(measureCounterWindow(samples, { startTime: 0, endTime: 30_000 })).toEqual({
			rate: 10,
			completed: 300,
			actualDurationMs: 30_000,
			sampleCount: 16,
			coverage: 1,
		});
	});

	test('ignores duplicate polls between scrapes', () => {
		const samples = Array.from({ length: 31 }, (_, index) => {
			const scrape = Math.floor(index / 2);
			return sample(index * 1_000, scrape * 20, index % 2 === 0 ? 20 : 0);
		});

		const result = measureCounterWindow(samples, { startTime: 0, endTime: 30_000 });

		expect(result?.rate).toBeCloseTo(10);
		expect(result?.sampleCount).toBe(16);
	});

	test('uses the covered duration when samples miss both boundaries', () => {
		const samples = Array.from({ length: 15 }, (_, index) =>
			sample(1_000 + index * 2_000, index * 20, index === 0 ? 0 : 20),
		);

		const result = measureCounterWindow(samples, { startTime: 0, endTime: 30_000 });

		expect(result?.rate).toBe(10);
		expect(result?.actualDurationMs).toBe(28_000);
		expect(result?.coverage).toBeCloseTo(28 / 30);
	});

	test('rejects a short burst inside a long tail window', () => {
		const samples = [sample(0, 0, 0), sample(2_000, 1_000, 1_000), sample(4_000, 2_000, 1_000)];

		expect(measureCounterWindow(samples, { startTime: 0, endTime: 60_000 })).toBeUndefined();
	});

	test('rejects polls with too few counter advances', () => {
		const samples = [sample(0, 0, 0), sample(10_000, 0, 0), sample(20_000, 10, 10)];

		expect(measureCounterWindow(samples, { startTime: 0, endTime: 20_000 })).toBeUndefined();
	});
});

describe('measureStageWindows', () => {
	test('uses actual stage boundaries and suppresses an uncovered tail', () => {
		const samples = [
			sample(10_000, 0, 0),
			sample(20_000, 100, 100),
			sample(30_000, 200, 100),
			sample(40_000, 300, 100),
		];

		const [stage] = measureStageWindows(samples, [10_000, 40_000]);

		expect(stage).toMatchObject({
			startTimestamp: 10_000,
			endTimestamp: 40_000,
			completedDuringStage: 300,
			tailExecPerSec: 10,
		});
		expect(measureStageWindows(samples, [0, 60_000])[0]?.tailExecPerSec).toBeUndefined();
	});
});

describe('measureSteadyPhases', () => {
	test('uses the actual publisher end for input and drain metrics', () => {
		const samples = Array.from({ length: 16 }, (_, index) =>
			sample(index * 10_000, index * 100, index === 0 ? 0 : 100),
		);

		expect(measureSteadyPhases(samples, 0, 120_000)).toMatchObject({
			inputPhaseCompleted: 1_200,
			inputPhaseDurationMs: 120_000,
			inputPhaseExecPerSec: 10,
			drainPhaseCompleted: 300,
			drainPhaseDurationMs: 30_000,
			drainPhaseExecPerSec: 10,
		});
	});
});
