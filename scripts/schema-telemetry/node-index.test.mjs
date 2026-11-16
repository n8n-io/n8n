import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildNodeIndex } from './node-index.mjs';

const packages = [
	{
		name: 'n8n-nodes-base',
		dir: 'packages/nodes-base',
		nodes: [
			'dist/nodes/Telegram/Telegram.node.js',
			'dist/nodes/Telegram/TelegramTrigger.node.js',
			'dist/nodes/Form/Form.node.js',
			'dist/nodes/Form/FormTrigger.node.js',
		],
	},
	{
		name: '@n8n/n8n-nodes-langchain',
		dir: 'packages/@n8n/nodes-langchain',
		nodes: ['dist/nodes/vendors/Anthropic/Anthropic.node.js'],
	},
];

describe('buildNodeIndex', () => {
	it('maps a node type to its source folder by file name', () => {
		const index = buildNodeIndex(packages, {
			types: ['n8n-nodes-base.telegramTrigger'],
			noOperationTypes: [],
		});

		assert.equal(
			index.get('n8n-nodes-base.telegramTrigger')?.dir,
			'packages/nodes-base/nodes/Telegram',
		);
	});

	it('maps a node type in another package', () => {
		const index = buildNodeIndex(packages, {
			types: ['@n8n/n8n-nodes-langchain.anthropic'],
			noOperationTypes: [],
		});

		assert.equal(
			index.get('@n8n/n8n-nodes-langchain.anthropic')?.dir,
			'packages/@n8n/nodes-langchain/nodes/vendors/Anthropic',
		);
	});

	it('lists other nodes without an operation in the same folder', () => {
		const index = buildNodeIndex(packages, {
			types: ['n8n-nodes-base.formTrigger', 'n8n-nodes-base.form'],
			noOperationTypes: ['n8n-nodes-base.formTrigger', 'n8n-nodes-base.form'],
		});

		assert.deepEqual(index.get('n8n-nodes-base.formTrigger')?.noOperationSiblings, [
			'n8n-nodes-base.form',
		]);
	});

	it('ignores a sibling that always has an operation', () => {
		const index = buildNodeIndex(packages, {
			types: ['n8n-nodes-base.telegramTrigger', 'n8n-nodes-base.telegram'],
			noOperationTypes: ['n8n-nodes-base.telegramTrigger'],
		});

		assert.deepEqual(index.get('n8n-nodes-base.telegramTrigger')?.noOperationSiblings, []);
	});

	it('leaves out a type that has no node file', () => {
		const index = buildNodeIndex(packages, {
			types: ['n8n-nodes-base.missing'],
			noOperationTypes: [],
		});

		assert.equal(index.has('n8n-nodes-base.missing'), false);
	});
});

describe('buildNodeIndex source file', () => {
	it('records the TypeScript source file of the node', () => {
		const index = buildNodeIndex(packages, {
			types: ['n8n-nodes-base.telegramTrigger'],
			noOperationTypes: [],
		});

		assert.equal(
			index.get('n8n-nodes-base.telegramTrigger')?.sourceFile,
			'packages/nodes-base/nodes/Telegram/TelegramTrigger.node.ts',
		);
	});
});

describe('buildNodeIndex schemaPath', () => {
	it('uses the schemaPath that a node declares as its folder', () => {
		const index = buildNodeIndex(packages, {
			types: ['n8n-nodes-base.formTrigger'],
			noOperationTypes: ['n8n-nodes-base.formTrigger', 'n8n-nodes-base.form'],
			schemaPaths: new Map([['n8n-nodes-base.formTrigger', 'Form/FormTrigger']]),
		});

		assert.equal(
			index.get('n8n-nodes-base.formTrigger')?.dir,
			'packages/nodes-base/nodes/Form/FormTrigger',
		);
	});

	it('no longer reports a sibling once the node has its own schemaPath', () => {
		const index = buildNodeIndex(packages, {
			types: ['n8n-nodes-base.formTrigger'],
			noOperationTypes: ['n8n-nodes-base.formTrigger', 'n8n-nodes-base.form'],
			schemaPaths: new Map([['n8n-nodes-base.formTrigger', 'Form/FormTrigger']]),
		});

		assert.deepEqual(index.get('n8n-nodes-base.formTrigger')?.noOperationSiblings, []);
	});
});
