import { describe, expect, test } from 'vitest';

import { resolveContainerMemoryLimits } from '../services/n8n';

const MIB = 1024 * 1024;
const CLOUD_STARTER_BYTES = 768 * MIB;

describe('resolveContainerMemoryLimits', () => {
	test('leaves memory limits unset by default', () => {
		expect(resolveContainerMemoryLimits('test-n8n', {})).toEqual({
			memoryBytes: undefined,
			memorySwapBytes: undefined,
		});
	});

	test('accepts explicit memoryBytes and equal memorySwapBytes to disable swap', () => {
		expect(
			resolveContainerMemoryLimits('test-n8n', {
				memoryBytes: CLOUD_STARTER_BYTES,
				memorySwapBytes: CLOUD_STARTER_BYTES,
			}),
		).toEqual({
			memoryBytes: CLOUD_STARTER_BYTES,
			memorySwapBytes: CLOUD_STARTER_BYTES,
		});
	});

	test('accepts memorySwapBytes with resourceQuota.memory or -1 for unlimited swap', () => {
		expect(
			resolveContainerMemoryLimits('test-n8n', {
				resourceQuotaMemoryGb: 0.75,
				memorySwapBytes: CLOUD_STARTER_BYTES,
			}),
		).toEqual({
			memoryBytes: undefined,
			memorySwapBytes: CLOUD_STARTER_BYTES,
		});

		expect(
			resolveContainerMemoryLimits('test-n8n', {
				memoryBytes: CLOUD_STARTER_BYTES,
				memorySwapBytes: -1,
			}),
		).toEqual({
			memoryBytes: CLOUD_STARTER_BYTES,
			memorySwapBytes: -1,
		});
	});

	test('validates memorySwapBytes against memoryBytes when both memoryBytes and resourceQuota.memory are set', () => {
		expect(
			resolveContainerMemoryLimits('test-n8n', {
				resourceQuotaMemoryGb: 1,
				memoryBytes: 512 * MIB,
				memorySwapBytes: 512 * MIB,
			}),
		).toEqual({
			memoryBytes: 512 * MIB,
			memorySwapBytes: 512 * MIB,
		});
	});

	test.each([0, -1, -100, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects invalid memoryBytes: %s',
		(memoryBytes) => {
			expect(() => resolveContainerMemoryLimits('test-n8n', { memoryBytes })).toThrow(
				/n8nContainer\.memoryBytes to be a positive integer/,
			);
		},
	);

	test.each([0, -2, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects invalid memorySwapBytes: %s',
		(memorySwapBytes) => {
			expect(() =>
				resolveContainerMemoryLimits('test-n8n', {
					memoryBytes: CLOUD_STARTER_BYTES,
					memorySwapBytes,
				}),
			).toThrow(/n8nContainer\.memorySwapBytes to be a positive integer or -1/);
		},
	);

	test('rejects memorySwapBytes without a memory limit', () => {
		expect(() =>
			resolveContainerMemoryLimits('test-n8n', { memorySwapBytes: CLOUD_STARTER_BYTES }),
		).toThrow(/cannot set n8nContainer\.memorySwapBytes without/);
	});

	test('rejects memorySwapBytes smaller than the effective memory limit', () => {
		expect(() =>
			resolveContainerMemoryLimits('test-n8n', {
				memoryBytes: CLOUD_STARTER_BYTES,
				memorySwapBytes: 512 * MIB,
			}),
		).toThrow(/to be >= memory limit/);

		expect(() =>
			resolveContainerMemoryLimits('test-n8n', {
				resourceQuotaMemoryGb: 0.75,
				memorySwapBytes: 512 * MIB,
			}),
		).toThrow(/to be >= memory limit/);
	});
});
