import { describe, expect, test } from 'vitest';

import { diveReportSchema, summarizeDiveReport } from './dive-results';

function report() {
	return {
		layer: [
			{ index: 0, digestId: 'base', sizeBytes: 100, command: 'ADD base', fileList: [] },
			{ index: 1, digestId: 'app', sizeBytes: 900, command: 'COPY app', fileList: [] },
		],
		image: {
			sizeBytes: 1000,
			inefficientBytes: 100,
			efficiencyScore: 0.9,
			fileReference: [
				{ count: 2, sizeBytes: 20, file: '/small' },
				{ count: 3, sizeBytes: 80, file: '/large' },
			],
		},
	};
}

describe('Dive report', () => {
	test('keeps layer and file attribution in size order without changing the report', () => {
		const parsed = diveReportSchema.parse(report());
		const summary = summarizeDiveReport(parsed);
		expect(summary).toMatchObject({
			sizeBytes: 1000,
			wastedBytes: 100,
			efficiencyPercent: 90,
			layerCount: 2,
		});
		expect(summary.largestLayers.map((layer) => layer.digestId)).toEqual(['app', 'base']);
		expect(summary.largestWastedFiles.map((file) => file.file)).toEqual(['/large', '/small']);
		expect(parsed.layer[0].digestId).toBe('base');
		expect(parsed.image.fileReference[0].file).toBe('/small');
	});

	for (const score of [-1, 1.01, NaN, Infinity]) {
		test(`rejects an invalid efficiency score: ${score}`, () => {
			const input = report();
			input.image.efficiencyScore = score;
			expect(diveReportSchema.safeParse(input).success).toBe(false);
		});
	}

	test('rejects missing layers and an empty image', () => {
		expect(diveReportSchema.safeParse({ ...report(), layer: [] }).success).toBe(false);
		const input = report();
		input.image.sizeBytes = 0;
		expect(diveReportSchema.safeParse(input).success).toBe(false);
	});

	test('accepts an image without layer waste', () => {
		const input = report();
		input.image.inefficientBytes = 0;
		input.image.efficiencyScore = 1;
		input.image.fileReference = [];
		expect(summarizeDiveReport(diveReportSchema.parse(input))).toMatchObject({
			wastedBytes: 0,
			efficiencyPercent: 100,
			largestWastedFiles: [],
		});
	});
});
