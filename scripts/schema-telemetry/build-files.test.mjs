import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFiles } from './build-files.mjs';

const index = new Map([
	['n8n-nodes-base.gmail', { dir: 'nodes/Google/Gmail', noOperationSiblings: [] }],
	['n8n-nodes-base.telegramTrigger', { dir: 'nodes/Telegram', noOperationSiblings: [] }],
]);

const schema = (keys) =>
	JSON.stringify({
		type: 'object',
		properties: Object.fromEntries(keys.map((k) => [k, { type: 'string' }])),
	});

const row = (overrides) => ({
	node_type: 'n8n-nodes-base.gmail',
	node_version: '2.2',
	resource: 'message',
	operation: 'get',
	simplify_param: null,
	simplify: null,
	workflows: '20',
	samples: [schema(['id'])],
	...overrides,
});

const noFiles = () => false;
const defaultOf = () => 'true';

describe('buildFiles', () => {
	it('merges groups that land in the same file', () => {
		const { files } = buildFiles(
			[
				row({ samples: [schema(['id', 'snippet'])] }),
				row({ simplify_param: 'simple', simplify: 'true', samples: [schema(['id', 'snippet'])] }),
			],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.equal(files.length, 1);
		assert.equal(files[0].file, 'nodes/Google/Gmail/__schema__/v2.2.0/message/get.json');
		assert.equal(files[0].workflows, 40);
		assert.deepEqual(Object.keys(files[0].schema.properties), ['id', 'snippet']);
	});

	it('reports a file that already exists instead of writing it', () => {
		const result = buildFiles([row({})], index, { exists: () => true, defaultOf });

		assert.deepEqual(result.files, []);
		assert.deepEqual(result.existing, ['nodes/Google/Gmail/__schema__/v2.2.0/message/get.json']);
	});

	it('reports why a group is skipped', () => {
		const { skipped } = buildFiles([row({ node_type: 'n8n-nodes-base.unknown' })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.equal(skipped.length, 1);
		assert.match(skipped[0].reason, /unknown node/);
	});

	it('collects schemaPath hints for each node type', () => {
		const { schemaPaths } = buildFiles(
			[row({ node_type: 'n8n-nodes-base.telegramTrigger', resource: null, operation: null })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(schemaPaths, { 'n8n-nodes-base.telegramTrigger': 'Telegram' });
	});

	it('ignores a sample that is not valid JSON', () => {
		const { files } = buildFiles([row({ samples: ['{not json', schema(['id'])] })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.deepEqual(files[0].schema, { type: 'object', properties: { id: { type: 'string' } } });
	});
});

describe('buildFiles filters', () => {
	it('writes the stable keys as an open object when samples add user-defined keys', () => {
		const result = buildFiles(
			[row({ samples: ['a', 'b', 'c', 'd', 'e'].map((f) => schema(['id', `${f}1`, `${f}2`])) })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(result.files[0].schema, {
			type: 'object',
			properties: { id: { type: 'string' } },
			additionalProperties: true,
		});
	});

	it('keeps an object closed when its keys are stable', () => {
		const { files } = buildFiles([row({ samples: [schema(['id']), schema(['id'])] })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.equal('additionalProperties' in files[0].schema, false);
	});

	it('skips a file whose samples share no key', () => {
		const result = buildFiles(
			[row({ samples: ['a', 'b', 'c', 'd', 'e'].map((f) => schema([`${f}1`])) })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(result.files, []);
		assert.match(result.skipped[0].reason, /no stable keys/);
	});

	it('keeps only the newest version of an operation', () => {
		const { files } = buildFiles(
			[row({ node_version: '2.1' }), row({ node_version: '2.10' })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(
			files.map((f) => f.file),
			['nodes/Google/Gmail/__schema__/v2.10.0/message/get.json'],
		);
	});

	it('reports an older version as skipped', () => {
		const { skipped } = buildFiles(
			[row({ node_version: '2.1' }), row({ node_version: '2.2' })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.match(skipped[0].reason, /not the chosen version/);
	});
});

describe('buildFiles node type', () => {
	it('tags each file with the node type it belongs to', () => {
		const { files } = buildFiles([row({})], index, { exists: noFiles, defaultOf });

		assert.equal(files[0].nodeType, 'n8n-nodes-base.gmail');
	});
});

describe('buildFiles root', () => {
	it('ignores samples whose root is not an object, because item json is always an object', () => {
		const { files } = buildFiles(
			[row({ samples: [schema(['id']), JSON.stringify({ type: 'string' })] })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(files[0].schema, { type: 'object', properties: { id: { type: 'string' } } });
	});
});

describe('buildFiles small groups', () => {
	const fiveOf = (keys) => Array.from({ length: 5 }, () => schema(keys));

	it('writes a file for a group under 20 workflows when the samples agree', () => {
		const { files } = buildFiles(
			[row({ workflows: '5', samples: fiveOf(['id', 'snippet']) })],
			index,
			{
				exists: noFiles,
				defaultOf,
			},
		);

		assert.deepEqual(Object.keys(files[0].schema.properties), ['id', 'snippet']);
	});

	it('skips a group under 20 workflows when one sample adds its own key', () => {
		const samples = [...fiveOf(['id']).slice(1), schema(['id', 'Customer Name'])];
		const result = buildFiles([row({ workflows: '5', samples })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.deepEqual(result.files, []);
		assert.match(result.skipped[0].reason, /samples disagree/);
	});

	it('keeps a key that half of the samples in a small group have', () => {
		const samples = [...fiveOf(['id']).slice(0, 2), ...fiveOf(['id', 'labels']).slice(0, 3)];
		const { files } = buildFiles([row({ workflows: '5', samples })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.deepEqual(Object.keys(files[0].schema.properties), ['id', 'labels']);
	});

	it('skips a group under 20 workflows when a nested object holds a key of its own', () => {
		const nested = (extra) =>
			JSON.stringify({
				type: 'object',
				properties: {
					id: { type: 'string' },
					fields: {
						type: 'object',
						properties: Object.fromEntries(['email', ...extra].map((k) => [k, { type: 'string' }])),
					},
				},
			});
		const samples = [nested([]), nested([]), nested([]), nested([]), nested(['Customer Tier'])];
		const result = buildFiles([row({ workflows: '5', samples })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.deepEqual(result.files, []);
		assert.match(result.skipped[0].reason, /samples disagree/);
	});

	it('writes a small group whose nested objects agree', () => {
		const nested = JSON.stringify({
			type: 'object',
			properties: {
				id: { type: 'string' },
				fields: { type: 'object', properties: { email: { type: 'string' } } },
			},
		});
		const { files } = buildFiles([row({ workflows: '5', samples: Array(5).fill(nested) })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.equal(files.length, 1);
	});

	it('skips a group under 20 workflows with fewer than 5 samples', () => {
		const result = buildFiles(
			[row({ workflows: '5', samples: fiveOf(['id']).slice(0, 4) })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(result.files, []);
		assert.match(result.skipped[0].reason, /too few samples/);
	});
});

describe('buildFiles small groups and versions', () => {
	const fiveOf = (keys) => Array.from({ length: 5 }, () => schema(keys));

	it('keeps an older version with 20 workflows over a newer version with fewer', () => {
		const { files } = buildFiles(
			[
				row({ node_version: '2.1' }),
				row({ node_version: '2.2', workflows: '5', samples: fiveOf(['id']) }),
			],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(
			files.map((f) => f.file),
			['nodes/Google/Gmail/__schema__/v2.1.0/message/get.json'],
		);
	});

	it('uses the newest small version when no version has 20 workflows', () => {
		const { files } = buildFiles(
			[
				row({ node_version: '2.1', workflows: '5', samples: fiveOf(['id']) }),
				row({ node_version: '2.2', workflows: '6', samples: fiveOf(['id']) }),
			],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(
			files.map((f) => f.file),
			['nodes/Google/Gmail/__schema__/v2.2.0/message/get.json'],
		);
	});
});

describe('buildFiles accounts', () => {
	const copies = (n, keys) => Array.from({ length: n }, () => schema(keys));

	it('uses one sample per account, so one account cannot add its own keys', () => {
		const samples = [...copies(5, ['id']), ...copies(3, ['id', 'Dateiname'])];
		const { files } = buildFiles([row({ workflows: '8', users: '5', samples })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.deepEqual(files[0].schema, { type: 'object', properties: { id: { type: 'string' } } });
	});

	it('skips a group of 20 or more workflows from fewer than 5 accounts', () => {
		const result = buildFiles(
			[row({ workflows: '30', users: '3', samples: copies(20, ['id']) })],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(result.files, []);
		assert.match(result.skipped[0].reason, /too few accounts/);
	});

	it('keeps the rules for 20 or more workflows when they come from fewer than 20 accounts', () => {
		const samples = [...copies(4, ['id']), schema(['id', 'labels']), ...copies(5, ['id'])];
		const { files } = buildFiles([row({ workflows: '30', users: '6', samples })], index, {
			exists: noFiles,
			defaultOf,
		});

		assert.deepEqual(Object.keys(files[0].schema.properties), ['id']);
	});
});

describe('buildFiles accounts and versions', () => {
	it('does not prefer an older version whose workflows come from fewer than 20 accounts', () => {
		const five = Array.from({ length: 5 }, () => schema(['id']));
		const { files } = buildFiles(
			[
				row({ node_version: '2.1', workflows: '30', users: '3', samples: five }),
				row({ node_version: '2.2', workflows: '5', users: '5', samples: five }),
			],
			index,
			{ exists: noFiles, defaultOf },
		);

		assert.deepEqual(
			files.map((f) => f.file),
			['nodes/Google/Gmail/__schema__/v2.2.0/message/get.json'],
		);
	});
});

describe('buildFiles other versions', () => {
	it('reports a file as covered when another version of the same major has it', () => {
		const result = buildFiles([row({})], index, {
			exists: noFiles,
			coveredBySameMajor: (file) => file.endsWith('message/get.json'),
			defaultOf,
		});

		assert.deepEqual(result.files, []);
		assert.match(result.skipped[0].reason, /same major/);
	});
});
