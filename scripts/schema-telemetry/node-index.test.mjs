import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildNodeIndex, noOperationTypesOf } from './node-index.mjs';

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

describe('buildNodeIndex known nodes', () => {
	const withKnown = (known) => [{ ...packages[0], known }, packages[1]];

	it('maps a node type whose file has another name through the known nodes list', () => {
		const index = buildNodeIndex(
			withKnown({ sendInBlue: { sourcePath: 'dist/nodes/Brevo/Brevo.node.js' } }),
			{ types: ['n8n-nodes-base.sendInBlue'], noOperationTypes: [] },
		);

		assert.equal(index.get('n8n-nodes-base.sendInBlue')?.dir, 'packages/nodes-base/nodes/Brevo');
	});

	it('records the source file of an enterprise node from the known nodes list', () => {
		const index = buildNodeIndex(
			withKnown({
				evaluation: { sourcePath: 'dist/nodes/Evaluation/Evaluation/Evaluation.node.ee.js' },
			}),
			{ types: ['n8n-nodes-base.evaluation'], noOperationTypes: [] },
		);

		assert.equal(
			index.get('n8n-nodes-base.evaluation')?.sourceFile,
			'packages/nodes-base/nodes/Evaluation/Evaluation/Evaluation.node.ee.ts',
		);
	});

	it('falls back to the file name for a type that the known nodes list leaves out', () => {
		const index = buildNodeIndex(withKnown({}), {
			types: ['n8n-nodes-base.telegramTrigger'],
			noOperationTypes: [],
		});

		assert.equal(
			index.get('n8n-nodes-base.telegramTrigger')?.dir,
			'packages/nodes-base/nodes/Telegram',
		);
	});
});

describe('noOperationTypesOf', () => {
	it('lists a node type that telemetry never shows with an operation', () => {
		const rows = [{ node_type: 'n8n-nodes-base.gmailTrigger', operation: null }];

		assert.deepEqual(noOperationTypesOf(rows), ['n8n-nodes-base.gmailTrigger']);
	});

	it('leaves out an action node that some rows show on its default operation', () => {
		const rows = [
			{ node_type: 'n8n-nodes-base.gmail', operation: 'send' },
			{ node_type: 'n8n-nodes-base.gmail', operation: null },
		];

		assert.deepEqual(noOperationTypesOf(rows), []);
	});
});
