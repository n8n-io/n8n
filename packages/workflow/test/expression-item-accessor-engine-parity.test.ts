// @vitest-environment jsdom

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import { Workflow } from '../src/workflow';

// Engine-parity tests for the legacy `$item(index)` accessor surface.
//
// `$item(index)` returns a full item-scoped data proxy that exposes the whole
// accessor surface (`$json`, `$node`, `$nodeId`, `$workflow`, ...), not just
// `$json`/`$binary`. Under the VM engine the in-isolate `$item` originally
// returned only `{ $json, $binary }`, so `$item(0).$node[...]` and
// `$item(0).$nodeId` resolved to undefined at runtime while the legacy engine
// (and the editor preview) returned the correct value (CAT-3496).
//
// These cases run under both the legacy and VM engines (see `vitest.config.ts`)
// so any divergence fails exactly one project.

describe('Expression — legacy $item(index) accessor surface (engine parity)', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Init Data',
				typeVersion: 1,
				type: 'test.set',
				id: 'init-data-1',
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Current',
				typeVersion: 1,
				type: 'test.set',
				id: 'current-1',
				position: [100, 0],
				parameters: {},
			},
		],
		connections: {
			'Init Data': {
				main: [[{ node: 'Current', type: 'main', index: 0 }]],
			},
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	const runExecutionData = createRunExecutionData({
		resultData: {
			runData: {
				'Init Data': [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: { main: [[{ json: { new: '2.27.0' } }]] },
					},
				],
			},
		},
	});

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	const evaluate = (expr: string) =>
		expression.getParameterValue(
			expr,
			runExecutionData,
			0, // runIndex of the active node
			0, // itemIndex
			'Current',
			[
				{
					json: { link: 'right' },
					binary: { myFile: { data: '', mimeType: 'text/plain', fileName: 'test.txt' } },
				},
				{ json: { link: 'left' } },
			],
			'manual',
			{},
		);

	it('resolves $item(0).$node["Name"].json["key"] (issue repro)', () => {
		expect(evaluate('={{ $item(0).$node["Init Data"].json["new"] }}')).toBe('2.27.0');
	});

	it('resolves $item(0).$nodeId to the active node id', () => {
		expect(evaluate('={{ $item(0).$nodeId }}')).toBe('current-1');
	});

	it('still resolves $item(0).$json (regression guard)', () => {
		expect(evaluate('={{ $item(0).$json["link"] }}')).toBe('right');
	});

	it('still resolves $item(0).$binary (regression guard)', () => {
		expect(evaluate('={{ $item(0).$binary["myFile"]["fileName"] }}')).toBe('test.txt');
	});

	it('resolves $item(index) for index > 0 over a multi-item input', () => {
		expect(evaluate('={{ $item(1).$json["link"] }}')).toBe('left');
	});
});
