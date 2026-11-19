import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planSchemaFile } from './plan.mjs';

const index = new Map([
	['n8n-nodes-base.telegramTrigger', { dir: 'nodes/Telegram', noOperationSiblings: [] }],
	['n8n-nodes-base.scheduleTrigger', { dir: 'nodes/Schedule', noOperationSiblings: [] }],
	['n8n-nodes-base.gmail', { dir: 'nodes/Google/Gmail', noOperationSiblings: [] }],
	['n8n-nodes-base.gmailTrigger', { dir: 'nodes/Google/Gmail', noOperationSiblings: [] }],
	['n8n-nodes-base.googleDrive', { dir: 'nodes/Google/Drive', noOperationSiblings: [] }],
	[
		'n8n-nodes-base.formTrigger',
		{ dir: 'nodes/Form', noOperationSiblings: ['n8n-nodes-base.form'] },
	],
]);

const opts = { defaultOf: () => 'true' };

const group = (overrides) => ({
	node_type: 'n8n-nodes-base.scheduleTrigger',
	node_version: '1.2',
	resource: null,
	operation: null,
	simplify_param: null,
	simplify: null,
	...overrides,
});

describe('planSchemaFile', () => {
	it('places a node without an operation at the version root', () => {
		const plan = planSchemaFile(group({}), index, opts);

		assert.equal(plan.file, 'nodes/Schedule/__schema__/v1.2.0/output.json');
	});

	it('places an operation under its resource folder', () => {
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.gmail',
				node_version: '2.2',
				resource: 'message',
				operation: 'get',
			}),
			index,
			opts,
		);

		assert.equal(plan.file, 'nodes/Google/Gmail/__schema__/v2.2.0/message/get.json');
	});

	it('writes a non-default top-level simplify value to a variant file', () => {
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.gmail',
				node_version: '2.2',
				resource: 'message',
				operation: 'get',
				simplify_param: 'simple',
				simplify: 'false',
			}),
			index,
			opts,
		);

		assert.equal(plan.file, 'nodes/Google/Gmail/__schema__/v2.2.0/message/get.simple-false.json');
	});

	it('writes the default simplify value to the plain file', () => {
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.gmail',
				node_version: '2.2',
				resource: 'message',
				operation: 'get',
				simplify_param: 'simple',
				simplify: 'true',
			}),
			index,
			opts,
		);

		assert.equal(plan.file, 'nodes/Google/Gmail/__schema__/v2.2.0/message/get.json');
	});

	it('writes a variant of a parameter nested in a collection', () => {
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.googleDrive',
				node_version: '3',
				resource: 'file',
				operation: 'upload',
				simplify_param: 'options.simplifyOutput',
				simplify: 'false',
			}),
			index,
			opts,
		);

		assert.equal(
			plan.file,
			'nodes/Google/Drive/__schema__/v3.0.0/file/upload.options.simplifyOutput-false.json',
		);
	});

	it('writes a simplify variant of a node without an operation next to output.json', () => {
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.gmailTrigger',
				simplify_param: 'simple',
				simplify: 'false',
			}),
			index,
			opts,
		);

		assert.equal(plan.file, 'nodes/Google/Gmail/__schema__/v1.2.0/output.simple-false.json');
	});

	it('skips a node whose folder has another node without an operation', () => {
		const plan = planSchemaFile(
			group({ node_type: 'n8n-nodes-base.formTrigger', node_version: '2.5' }),
			index,
			opts,
		);

		assert.match(plan.skip, /n8n-nodes-base\.form/);
	});

	it('skips a node type that is not in the index', () => {
		const plan = planSchemaFile(group({ node_type: 'n8n-nodes-base.unknown' }), index, opts);

		assert.match(plan.skip, /unknown node/);
	});

	it('suggests a schemaPath when the folder name differs from the node name', () => {
		const plan = planSchemaFile(
			group({ node_type: 'n8n-nodes-base.telegramTrigger' }),
			index,
			opts,
		);

		assert.equal(plan.schemaPath, 'Telegram');
	});

	it('suggests no schemaPath when the folder name matches the node name', () => {
		const plan = planSchemaFile(
			group({ node_type: 'n8n-nodes-base.gmail', resource: 'message', operation: 'get' }),
			index,
			opts,
		);

		assert.equal(plan.schemaPath, undefined);
	});
});

describe('planSchemaFile scope', () => {
	it('skips a simplify flag that holds an expression', () => {
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.gmail',
				node_version: '2.2',
				resource: 'message',
				operation: 'get',
				simplify_param: 'simple',
				simplify: '=*',
			}),
			index,
			opts,
		);

		assert.match(plan.skip, /expression/);
	});

	it('skips a node without an operation that is not a trigger', () => {
		const plan = planSchemaFile(
			group({ node_type: 'n8n-nodes-base.gmail', resource: null, operation: null }),
			index,
			opts,
		);

		assert.match(plan.skip, /not a trigger/);
	});
});

describe('planSchemaFile defaults', () => {
	const perplexity = (simplify) =>
		group({
			node_type: 'n8n-nodes-base.gmail',
			node_version: '2.2',
			resource: 'message',
			operation: 'get',
			simplify_param: 'simplify',
			simplify,
		});

	it('writes the default value to the plain file when the default is false', () => {
		const plan = planSchemaFile(perplexity('false'), index, { defaultOf: () => 'false' });

		assert.equal(plan.file, 'nodes/Google/Gmail/__schema__/v2.2.0/message/get.json');
	});

	it('names a variant file by its non-default value', () => {
		const plan = planSchemaFile(perplexity('true'), index, { defaultOf: () => 'false' });

		assert.equal(plan.file, 'nodes/Google/Gmail/__schema__/v2.2.0/message/get.simplify-true.json');
	});

	it('skips a set simplify flag when the default is unknown', () => {
		const plan = planSchemaFile(perplexity('true'), index, { defaultOf: () => undefined });

		assert.match(plan.skip, /default/);
	});
});

describe('planSchemaFile pass-through nodes', () => {
	it('skips a node that passes its input items through', () => {
		const passThrough = new Map([
			...index,
			['n8n-nodes-base.editImage', { dir: 'nodes/EditImage', noOperationSiblings: [] }],
		]);
		const plan = planSchemaFile(
			group({ node_type: 'n8n-nodes-base.editImage', node_version: '2', operation: 'rotate' }),
			passThrough,
			opts,
		);

		assert.match(plan.skip, /passes its input/);
	});
});

describe('planSchemaFile evaluation node', () => {
	it('skips the evaluation node, because it passes dataset rows and metrics through', () => {
		const withEvaluation = new Map([
			...index,
			[
				'n8n-nodes-base.evaluation',
				{ dir: 'nodes/Evaluation/Evaluation', noOperationSiblings: [] },
			],
		]);
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.evaluation',
				node_version: '4.8',
				operation: 'setInputs',
			}),
			withEvaluation,
			opts,
		);

		assert.match(plan.skip, /passes its input/);
	});
});

describe('planSchemaFile item transform nodes', () => {
	for (const [nodeType, operation] of [
		['n8n-nodes-base.removeDuplicates', 'removeDuplicateItems'],
		['n8n-nodes-base.itemLists', 'splitOutItems'],
	]) {
		it(`skips ${nodeType}, because it outputs its input items`, () => {
			const withNode = new Map([
				...index,
				[nodeType, { dir: 'nodes/Transform', noOperationSiblings: [] }],
			]);
			const plan = planSchemaFile(
				group({ node_type: nodeType, node_version: '2', operation }),
				withNode,
				opts,
			);

			assert.match(plan.skip, /passes its input/);
		});
	}
});

describe('planSchemaFile skipped operations', () => {
	it('skips an operation whose output depends on what the user configured', () => {
		const withPhantom = new Map([
			...index,
			['n8n-nodes-base.phantombuster', { dir: 'nodes/Phantombuster', noOperationSiblings: [] }],
		]);
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.phantombuster',
				node_version: '1',
				resource: 'agent',
				operation: 'getAll',
			}),
			withPhantom,
			opts,
		);

		assert.match(plan.skip, /user-configured/);
	});
});

describe('planSchemaFile review fixes', () => {
	it('skips the Date & Time node, whose output is its input plus a configured field', () => {
		const withDateTime = new Map([
			...index,
			['n8n-nodes-base.dateTime', { dir: 'nodes/DateTime', noOperationSiblings: [] }],
		]);
		const plan = planSchemaFile(
			group({ node_type: 'n8n-nodes-base.dateTime', node_version: '2', operation: 'roundDate' }),
			withDateTime,
			opts,
		);

		assert.match(plan.skip, /passes its input/);
	});

	it('skips an operation without a resource on a node that has resources', () => {
		const withResources = new Map([
			...index,
			[
				'n8n-nodes-base.dataTable',
				{ dir: 'nodes/DataTable', noOperationSiblings: [], hasResource: true },
			],
		]);
		const plan = planSchemaFile(
			group({
				node_type: 'n8n-nodes-base.dataTable',
				node_version: '1.1',
				resource: null,
				operation: 'update',
			}),
			withResources,
			opts,
		);

		assert.match(plan.skip, /resource not set/);
	});
});
