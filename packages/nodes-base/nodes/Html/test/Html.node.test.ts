import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Html } from '../Html.node';

describe('Test Html Node > extractHtmlContent', () => {
	new NodeTestHarness().setupTests();
});

describe('Test Html Node > generateHtmlTemplate', () => {
	it.each([
		{ typeVersion: 1.3, expected: "<div><p>1$&2 1$$2 '^[0-9]+$'</p></div>" },
		{ typeVersion: 1.2, expected: "<div><p>1{{ $json.v }}2 1$2 '^[0-9]+</div></p></div>" },
	])(
		'should insert resolved values for version $typeVersion',
		async ({ typeVersion, expected }) => {
			const context = mock<IExecuteFunctions>({
				getInputData: () => [{ json: {} }],
				getNode: () => mock<INode>({ typeVersion }),
				getNodeParameter: ((name: string) =>
					({ operation: 'generateHtmlTemplate', html: '<div>{{ $json.v }}</div>' })[
						name
					]) as IExecuteFunctions['getNodeParameter'],
				evaluateExpression: () => "<p>1$&2 1$$2 '^[0-9]+$'</p>",
				helpers: mock({ constructExecutionMetaData, returnJsonArray }),
			});

			const [[item]] = await new Html().execute.call(context);

			expect(item.json.html).toBe(expected);
		},
	);
});
