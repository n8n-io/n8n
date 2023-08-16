import { executeWorkflow } from '../ExecuteWorkflow';
import * as Helpers from '../Helpers';
import type { WorkflowTestData } from '../types';
import nock from 'nock';

const records = [
	{
		id: 'rec2BWBoyS5QsS7pT',
		createdTime: '2022-08-25T08:22:34.000Z',
		fields: {
			name: 'Tim',
			email: 'tim@email.com',
		},
	},
];

describe('Execute Airtable Node', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://api.airtable.com/v0')
			.get('/appIaXXdDqS5ORr4V/tbljyBEdYzCPF0NDh?pageSize=100')
			.reply(200, { records });
	});

	afterEach(() => {
		nock.restore();
	});

	const tests: WorkflowTestData[] = [
		{
			description: 'List Airtable Records',
			input: {
				workflowData: Helpers.readJsonFileSync('test/nodes/Airtable/workflow.json'),
			},
			output: {
				nodeData: {
					Airtable: [[...records.map((r) => ({ json: r }))]],
				},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			// execute workflow
			const { result } = await executeWorkflow(testData, nodeTypes);

			// check if result node data matches expected test data
			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			expect(result.finished).toEqual(true);
		});
	}
});
