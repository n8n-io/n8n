import { NodeTestHarness } from '@nodes-testing/node-test-harness';

describe('Test Aggregate Node', () => {
	const harness = new NodeTestHarness();
	harness.setupTests();
	for (const { description, fields, error } of [
		{
			description:
				'should reject nested fields with the same output name during workflow execution',
			fields: [{ fieldToAggregate: 'customer.name' }, { fieldToAggregate: 'supplier.name' }],
			error: "The 'name' output field is used more than once",
		},
		{
			description: 'should resolve an empty active alias before checking for duplicates',
			fields: [
				{ fieldToAggregate: 'customer.name', renameField: true, outputFieldName: '' },
				{ fieldToAggregate: 'supplier.name' },
			],
			error: "The 'name' output field is used more than once",
		},
		{
			description: 'should ignore persisted aliases when renaming is disabled',
			fields: [
				{ fieldToAggregate: 'customer.name', renameField: false, outputFieldName: 'same' },
				{ fieldToAggregate: 'supplier.name', renameField: false, outputFieldName: 'same' },
			],
			error: "The 'name' output field is used more than once",
		},
		...[
			['user', 'user.name'],
			['user.name', 'user'],
		].map(([first, second]) => ({
			description: `should reject overlapping paths ${first} and ${second} during workflow execution`,
			fields: [
				{ fieldToAggregate: 'customer.name', renameField: true, outputFieldName: first },
				{ fieldToAggregate: 'supplier.name', renameField: true, outputFieldName: second },
			],
			error: `The '${second}' and '${first}' output fields overlap`,
		})),
	]) {
		harness.setupTest({
			description,
			input: {
				workflowData: {
					nodes: [
						{
							id: 'trigger',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'data',
							name: 'Data',
							type: 'n8n-nodes-testing.testData',
							typeVersion: 1,
							position: [200, 0],
							parameters: {
								data: [
									{ customer: { name: 'Alice' }, supplier: { name: 'Acme' } },
									{ customer: { name: 'Bob' }, supplier: { name: 'Beta' } },
								],
							},
						},
						{
							id: 'aggregate',
							name: 'Aggregate',
							type: 'n8n-nodes-base.aggregate',
							typeVersion: 1,
							position: [400, 0],
							parameters: {
								aggregate: 'aggregateIndividualFields',
								fieldsToAggregate: { fieldToAggregate: fields },
								options: {},
							},
						},
					],
					connections: {
						Start: { main: [[{ node: 'Data', type: 'main', index: 0 }]] },
						Data: { main: [[{ node: 'Aggregate', type: 'main', index: 0 }]] },
					},
				},
			},
			output: { nodeData: {}, error },
		});
	}
});
