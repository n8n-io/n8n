import { INodeType } from 'n8n-workflow';
import { executeWorkflow } from '../ExecuteWorkflow';
import * as Helpers from '../Helpers';
import { WorkflowTestData } from '../types';
import { readFileSync } from 'fs';
import nock from 'nock';

import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';
import { Airtable } from '../../../nodes/Airtable/Airtable.node';

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

	const tests: Array<WorkflowTestData> = [
		{
			description: 'List Airtable Records',
			input: {
				workflowData: JSON.parse(readFileSync('test/nodes/Airtable/workflow.json', 'utf-8')),
			},
			output: {
				nodeData: {
					Airtable: [[...records]],
				},
			},
		},
	];

	const nodes: INodeType[] = [new ManualTrigger(), new Airtable()];
	const nodeTypes = Helpers.setup(nodes);

	for (const testData of tests) {
		test(testData.description, async () => {
			// execute workflow
			const { executionData, result, nodeExecutionOrder } = await executeWorkflow(
				testData,
				nodeTypes,
			);

			// check if output node data is as expected
			for (const nodeName of Object.keys(testData.output.nodeData)) {
				if (result.data.resultData.runData[nodeName] === undefined) {
					throw new Error(`Data for node "${nodeName}" is missing!`);
				}
				const resultData = result.data.resultData.runData[nodeName].map((nodeData) => {
					if (nodeData.data === undefined) {
						return null;
					}
					return nodeData.data.main[0]!.map((entry) => entry.json);
				});
				expect(resultData).toEqual(testData.output.nodeData[nodeName]);
			}

			expect(result.finished).toEqual(true);
		});
	}
});
