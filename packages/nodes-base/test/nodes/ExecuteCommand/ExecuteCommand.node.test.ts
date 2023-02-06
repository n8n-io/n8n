import { INodeType } from 'n8n-workflow';
import * as Helpers from '../Helpers';
import { WorkflowTestData } from '../types';
import { executeWorkflow } from '../ExecuteWorkflow';

import { ExecuteCommand } from '../../../nodes/ExecuteCommand/ExecuteCommand.node';
import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';
import { Set } from '../../../nodes/Set/Set.node';
import { ItemLists } from '../../../nodes/ItemLists/ItemLists.node';

describe('Execute Execute Command Node', () => {
	const tests: Array<WorkflowTestData> = [
		{
			description: 'should execute Execute Command node',
			input: {
				workflowData: Helpers.readJsonFileSync('test/nodes/ExecuteCommand/workflow.json'),
			},
			output: {
				nodeData: {
					'EC Once': [
						[
							{
								exitCode: 0,
								stderr: '',
								stdout: 'n8n',
							},
						],
					],
					'EC All': [
						[
							{
								exitCode: 0,
								stderr: '',
								stdout: 'n8n',
							},
							{
								exitCode: 0,
								stderr: '',
								stdout: 'test',
							},
						],
					],
				},
			},
		},
	];

	const nodes: INodeType[] = [
		new ManualTrigger(),
		new Set(),
		new ItemLists(),
		new ExecuteCommand(),
	];
	const nodeTypes = Helpers.setup(nodes);

	for (const testData of tests) {
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);
			const resultNodeData = Helpers.getResultNodeData(result, testData);

			resultNodeData.forEach(({ nodeName, resultData }) =>
				expect(resultData).toEqual(testData.output.nodeData[nodeName]),
			);

			expect(result.finished).toEqual(true);
		});
	}
});
