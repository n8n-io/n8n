import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeSamples, stableKeyShare, stringifySchema } from './merge.mjs';

const obj = (properties) => ({ type: 'object', properties });

describe('mergeSamples', () => {
	it('keeps a key that every sample has', () => {
		const merged = mergeSamples([obj({ id: { type: 'string' } }), obj({ id: { type: 'string' } })]);

		assert.deepEqual(merged, obj({ id: { type: 'string' } }));
	});

	it('drops a key that fewer than half of the samples have', () => {
		const merged = mergeSamples([
			obj({ id: { type: 'string' }, myFormField: { type: 'string' } }),
			obj({ id: { type: 'string' } }),
			obj({ id: { type: 'string' } }),
		]);

		assert.deepEqual(merged, obj({ id: { type: 'string' } }));
	});

	it('applies the share threshold inside nested objects', () => {
		const merged = mergeSamples([
			obj({ message: obj({ text: { type: 'string' }, custom: { type: 'string' } }) }),
			obj({ message: obj({ text: { type: 'string' } }) }),
			obj({ message: obj({ text: { type: 'string' } }) }),
		]);

		assert.deepEqual(merged, obj({ message: obj({ text: { type: 'string' } }) }));
	});

	it('unions the types that samples report for one key', () => {
		const merged = mergeSamples([
			obj({ id: { type: 'string' } }),
			obj({ id: { type: 'integer' } }),
		]);

		assert.deepEqual(merged, obj({ id: { type: ['integer', 'string'] } }));
	});

	it('widens a key that is only ever null to unknown', () => {
		const merged = mergeSamples([obj({ note: { type: 'null' } }), obj({ note: { type: 'null' } })]);

		assert.deepEqual(merged, obj({ note: {} }));
	});

	it('ignores null when another sample has a real type', () => {
		const merged = mergeSamples([
			obj({ note: { type: 'null' } }),
			obj({ note: { type: 'string' } }),
		]);

		assert.deepEqual(merged, obj({ note: { type: 'string' } }));
	});

	it('reads anyOf as a union of its members', () => {
		const merged = mergeSamples([
			obj({ id: { anyOf: [{ type: 'string' }, { type: 'integer' }] } }),
			obj({ id: { type: 'string' } }),
		]);

		assert.deepEqual(merged, obj({ id: { type: ['integer', 'string'] } }));
	});

	it('merges array items across samples', () => {
		const merged = mergeSamples([
			obj({ tags: { type: 'array', items: obj({ name: { type: 'string' } }) } }),
			obj({ tags: { type: 'array', items: obj({ name: { type: 'string' } }) } }),
		]);

		assert.deepEqual(
			merged,
			obj({ tags: { type: 'array', items: obj({ name: { type: 'string' } }) } }),
		);
	});

	it('never emits required', () => {
		const sample = { ...obj({ id: { type: 'string' } }), required: ['id'] };

		assert.equal('required' in mergeSamples([sample, sample]), false);
	});

	it('drops keys that are record ids', () => {
		const key = '0f8fad5b-d9cb-469f-a165-70867728950e';
		const merged = mergeSamples([
			obj({ id: { type: 'string' }, [key]: { type: 'string' } }),
			obj({ id: { type: 'string' }, [key]: { type: 'string' } }),
		]);

		assert.deepEqual(merged, obj({ id: { type: 'string' } }));
	});

	it('honours a custom share threshold', () => {
		const merged = mergeSamples(
			[
				obj({ id: { type: 'string' }, extra: { type: 'string' } }),
				obj({ id: { type: 'string' } }),
				obj({ id: { type: 'string' } }),
			],
			{ minShare: 0.3 },
		);

		assert.deepEqual(merged, obj({ extra: { type: 'string' }, id: { type: 'string' } }));
	});
});

describe('stableKeyShare', () => {
	it('is 1 when every sample has the same keys', () => {
		const samples = [obj({ id: { type: 'string' } }), obj({ id: { type: 'string' } })];

		assert.equal(stableKeyShare(samples), 1);
	});

	it('counts an optional key that a fair share of samples have as stable', () => {
		const samples = [
			obj({ content: { type: 'string' }, merged_response: { type: 'string' } }),
			obj({ content: { type: 'string' } }),
			obj({ content: { type: 'string' } }),
			obj({ content: { type: 'string' } }),
		];

		assert.equal(stableKeyShare(samples), 1);
	});

	it('averages the share of keys in each sample that other samples share', () => {
		const samples = ['a', 'b', 'c', 'd', 'e'].map((field) =>
			obj({ id: { type: 'string' }, [field]: { type: 'string' } }),
		);

		// Each field is in 1 of 5 samples, so each sample has 1 stable key of 2.
		assert.equal(stableKeyShare(samples), 0.5);
	});

	it('ignores samples without top-level keys', () => {
		const samples = [{ type: 'string' }, obj({ id: { type: 'string' } })];

		assert.equal(stableKeyShare(samples), 1);
	});
});

describe('mergeSamples open objects', () => {
	it('leaves an object open when samples have keys but none are shared', () => {
		const merged = mergeSamples([
			obj({ fields: obj({ name: { type: 'string' } }) }),
			obj({ fields: obj({ email: { type: 'string' } }) }),
			obj({ fields: obj({ phone: { type: 'string' } }) }),
		]);

		assert.deepEqual(merged, obj({ fields: { type: 'object' } }));
	});
});

describe('stringifySchema', () => {
	it('sorts keys and indents with tabs, as Biome formats JSON', () => {
		const text = stringifySchema({
			type: 'object',
			properties: { b: { type: 'string' }, a: { type: 'string' } },
		});

		assert.equal(
			text,
			'{\n\t"properties": {\n\t\t"a": {\n\t\t\t"type": "string"\n\t\t},\n\t\t"b": {\n\t\t\t"type": "string"\n\t\t}\n\t},\n\t"type": "object"\n}\n',
		);
	});
});
