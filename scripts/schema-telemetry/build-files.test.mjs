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
	workflows: '10',
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
		assert.equal(files[0].workflows, 20);
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

		assert.match(skipped[0].reason, /older version/);
	});
});

describe('buildFiles node type', () => {
	it('tags each file with the node type it belongs to', () => {
		const { files } = buildFiles([row({})], index, { exists: noFiles, defaultOf });

		assert.equal(files[0].nodeType, 'n8n-nodes-base.gmail');
	});
});
