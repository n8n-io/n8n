import { INodeType } from 'n8n-workflow';
import * as Helpers from '../Helpers';
import { WorkflowTestData } from '../types';
import { executeWorkflow } from '../ExecuteWorkflow';

import { ExecuteCommand } from '../../../nodes/ExecuteCommand/ExecuteCommand.node';
import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';

describe('Run EC Node', () => {
	const tests: Array<WorkflowTestData> = [
		{
			description: 'should execute Execute Command Node',
			input: {
				workflowData: Helpers.readJsonFileSync('test/nodes/ExecuteCommand/workflow.json'),
			},
			output: {
				nodeData: {
					'Execute Command': [
						[
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

	const nodes: INodeType[] = [new ManualTrigger(), new ExecuteCommand()];
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
