import { mock } from 'vitest-mock-extended';
import type { INode } from 'n8n-workflow';

import {
	getAllowedDomains,
	responseToExecutionItems,
	updadeQueryParameterConfig,
} from '../GenericFunctions';

describe('responseToExecutionItems', () => {
	it('splits an array of objects into one item per element (unchanged behaviour)', () => {
		expect(responseToExecutionItems([{ a: 1 }, { a: 2 }], 0)).toEqual([
			{ json: { a: 1 }, pairedItem: { item: 0 } },
			{ json: { a: 2 }, pairedItem: { item: 0 } },
		]);
	});

	it('wraps a bare array of primitives so each json is a valid object', () => {
		expect(responseToExecutionItems([44001, 44002], 0)).toEqual([
			{ json: { data: 44001 }, pairedItem: { item: 0 } },
			{ json: { data: 44002 }, pairedItem: { item: 0 } },
		]);
	});

	it('wraps an array of arrays (e.g. Binance klines rows)', () => {
		expect(
			responseToExecutionItems(
				[
					[1, 2],
					[3, 4],
				],
				2,
			),
		).toEqual([
			{ json: { data: [1, 2] }, pairedItem: { item: 2 } },
			{ json: { data: [3, 4] }, pairedItem: { item: 2 } },
		]);
	});

	it('keeps a single object response as one item', () => {
		expect(responseToExecutionItems({ a: 1 }, 0)).toEqual([
			{ json: { a: 1 }, pairedItem: { item: 0 } },
		]);
	});

	it('wraps a single primitive response under data', () => {
		expect(responseToExecutionItems('hello', 1)).toEqual([
			{ json: { data: 'hello' }, pairedItem: { item: 1 } },
		]);
	});
});

describe('updadeQueryParameterConfig', () => {
	describe('version < 4.3 (legacy behavior)', () => {
		const updateQueryParam = updadeQueryParameterConfig(4.2);

		it('should set simple key-value pairs', () => {
			const qs = {};
			updateQueryParam(qs, 'key1', 'value1');
			expect(qs).toEqual({ key1: 'value1' });
		});

		it('should overwrite existing values', () => {
			const qs = { key1: 'oldValue' };
			updateQueryParam(qs, 'key1', 'newValue');
			expect(qs).toEqual({ key1: 'newValue' });
		});
	});

	describe('version >= 4.3 (array behavior)', () => {
		const updateQueryParam = updadeQueryParameterConfig(4.3);

		it('should set initial value when key does not exist', () => {
			const qs = {};
			updateQueryParam(qs, 'key1', 'value1');
			expect(qs).toEqual({ key1: 'value1' });
		});

		it('should create array when adding second value', () => {
			const qs = { key1: 'value1' };
			updateQueryParam(qs, 'key1', 'value2');
			expect(qs).toEqual({ key1: ['value1', 'value2'] });
		});

		it('should append to existing array', () => {
			const qs = { key1: ['value1', 'value2'] };
			updateQueryParam(qs, 'key1', 'value3');
			expect(qs).toEqual({ key1: ['value1', 'value2', 'value3'] });
		});

		it('should handle undefined values correctly', () => {
			const qs = {};
			updateQueryParam(qs, 'newKey', 'value');
			expect(qs).toEqual({ newKey: 'value' });
		});
	});

	describe('version boundary', () => {
		it('should use legacy behavior for version 4.2', () => {
			const updateQueryParam = updadeQueryParameterConfig(4.2);
			const qs = { key: 'first' };
			updateQueryParam(qs, 'key', 'second');
			expect(qs.key).toBe('second');
		});

		it('should use array behavior for version 4.3', () => {
			const updateQueryParam = updadeQueryParameterConfig(4.3);
			const qs = { key: 'first' };
			updateQueryParam(qs, 'key', 'second');
			expect(qs.key).toEqual(['first', 'second']);
		});
	});
});

describe('getAllowedDomains', () => {
	const node = mock<INode>();

	it('should return undefined when allowedHttpRequestDomains is not set', () => {
		const result = getAllowedDomains(node, {});
		expect(result).toBeUndefined();
	});

	it('should return undefined when allowedHttpRequestDomains is "all"', () => {
		const result = getAllowedDomains(node, { allowedHttpRequestDomains: 'all' });
		expect(result).toBeUndefined();
	});

	it('should throw when allowedHttpRequestDomains is "none"', () => {
		expect(() => getAllowedDomains(node, { allowedHttpRequestDomains: 'none' })).toThrow(
			'This credential is configured to prevent use within an HTTP Request node',
		);
	});

	it('should throw when allowedHttpRequestDomains is "domains" but allowedDomains is empty', () => {
		expect(() =>
			getAllowedDomains(node, {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: '',
			}),
		).toThrow('No allowed domains specified');
	});

	it('should throw when allowedHttpRequestDomains is "domains" but allowedDomains is whitespace', () => {
		expect(() =>
			getAllowedDomains(node, {
				allowedHttpRequestDomains: 'domains',
				allowedDomains: '   ',
			}),
		).toThrow('No allowed domains specified');
	});

	it('should throw when allowedHttpRequestDomains is "domains" but allowedDomains is undefined', () => {
		expect(() =>
			getAllowedDomains(node, {
				allowedHttpRequestDomains: 'domains',
			}),
		).toThrow('No allowed domains specified');
	});

	it('should return allowedDomains string when allowedHttpRequestDomains is "domains" with valid domains', () => {
		const result = getAllowedDomains(node, {
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'example.com, *.api.io',
		});

		expect(result).toBe('example.com, *.api.io');
	});
});
