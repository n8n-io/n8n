import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeSamples, stableKeyShare, stringifySchema } from './merge.mjs';

const obj = (properties) => ({ type: 'object', properties });

describe('mergeSamples', () => {
	it('keeps a key that every sample has', () => {
		const merged = mergeSamples([obj({ id: { type: 'string' } }), obj({ id: { type: 'string' } })]);

		assert.deepEqual(merged, obj({ id: { type: 'string' } }));
	});

	it('drops a key that fewer than half of the samples have and leaves the object open', () => {
		const merged = mergeSamples([
			obj({ id: { type: 'string' }, myFormField: { type: 'string' } }),
			obj({ id: { type: 'string' } }),
			obj({ id: { type: 'string' } }),
		]);

		assert.deepEqual(merged, { ...obj({ id: { type: 'string' } }), additionalProperties: true });
	});

	it('keeps an object closed when no sample has a key that the merge drops', () => {
		const merged = mergeSamples([obj({ id: { type: 'string' } }), obj({ id: { type: 'string' } })]);

		assert.equal('additionalProperties' in merged, false);
	});

	it('applies the share threshold inside nested objects', () => {
		const merged = mergeSamples([
			obj({ message: obj({ text: { type: 'string' }, custom: { type: 'string' } }) }),
			obj({ message: obj({ text: { type: 'string' } }) }),
			obj({ message: obj({ text: { type: 'string' } }) }),
		]);

		assert.deepEqual(
			merged,
			obj({ message: { ...obj({ text: { type: 'string' } }), additionalProperties: true } }),
		);
	});

	it('unions the types that samples report for one key', () => {
		const merged = mergeSamples([
			obj({ id: { type: 'string' } }),
			obj({ id: { type: 'integer' } }),
		]);

		assert.deepEqual(merged, obj({ id: { type: ['number', 'string'] } }));
	});

	it('widens a key that is only ever null to unknown', () => {
		const merged = mergeSamples([obj({ note: { type: 'null' } }), obj({ note: { type: 'null' } })]);

		assert.deepEqual(merged, obj({ note: {} }));
	});

	it('keeps null in the union when another sample has a real type', () => {
		const merged = mergeSamples([
			obj({ note: { type: 'null' } }),
			obj({ note: { type: 'string' } }),
		]);

		assert.deepEqual(merged, obj({ note: { type: ['null', 'string'] } }));
	});

	it('describes integers as numbers, because a sample cannot prove a value is never fractional', () => {
		const merged = mergeSamples([obj({ seconds: { type: 'integer' } })]);

		assert.deepEqual(merged, obj({ seconds: { type: 'number' } }));
	});

	it('keeps the properties of an object when samples also see another type', () => {
		const merged = mergeSamples([
			obj({ content: obj({ role: { type: 'string' } }) }),
			obj({ content: { type: 'string' } }),
		]);

		assert.deepEqual(
			merged,
			obj({ content: { type: ['object', 'string'], properties: { role: { type: 'string' } } } }),
		);
	});

	it('keeps the items of an array when samples also see another type', () => {
		const merged = mergeSamples([
			obj({ text: { type: 'array', items: { type: 'string' } } }),
			obj({ text: { type: 'string' } }),
		]);

		assert.deepEqual(
			merged,
			obj({ text: { type: ['array', 'string'], items: { type: 'string' } } }),
		);
	});

	it('leaves a nested object open when samples add their own keys to it', () => {
		const merged = mergeSamples(
			['a', 'b', 'c', 'd', 'e'].map((f) =>
				obj({ fields: obj({ ID: { type: 'string' }, [f]: { type: 'string' } }) }),
			),
		);

		assert.deepEqual(
			merged,
			obj({
				fields: {
					type: 'object',
					properties: { ID: { type: 'string' } },
					additionalProperties: true,
				},
			}),
		);
	});

	it('reads anyOf as a union of its members', () => {
		const merged = mergeSamples([
			obj({ id: { anyOf: [{ type: 'string' }, { type: 'integer' }] } }),
			obj({ id: { type: 'string' } }),
		]);

		assert.deepEqual(merged, obj({ id: { type: ['number', 'string'] } }));
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

	it('drops keys that are record ids and leaves the object open for them', () => {
		const key = '00000000-0000-4000-8000-000000000000';
		const merged = mergeSamples([
			obj({ id: { type: 'string' }, [key]: { type: 'string' } }),
			obj({ id: { type: 'string' }, [key]: { type: 'string' } }),
		]);

		assert.deepEqual(merged, { ...obj({ id: { type: 'string' } }), additionalProperties: true });
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

describe('mergeSamples user-defined bags', () => {
	it('drops keys that are numeric record ids', () => {
		const merged = mergeSamples([
			obj({ tracking: obj({ 1: { type: 'number' }, 2: { type: 'number' } }) }),
			obj({ tracking: obj({ 1: { type: 'number' } }) }),
		]);

		assert.deepEqual(merged, obj({ tracking: { type: 'object' } }));
	});

	it('describes a metadata object as open, because its keys are user-defined', () => {
		const sample = obj({ id: { type: 'string' }, metadata: obj({ orderRef: { type: 'string' } }) });

		assert.deepEqual(
			mergeSamples([sample, sample]),
			obj({ id: { type: 'string' }, metadata: { type: 'object' } }),
		);
	});
});
