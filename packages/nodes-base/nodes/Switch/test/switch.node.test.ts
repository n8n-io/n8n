import type { INodeType } from 'n8n-workflow';
import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';

import { Switch } from '../../../nodes/Switch/Switch.node';
import { ManualTrigger } from '../../../nodes/ManualTrigger/ManualTrigger.node';
import { Set } from '../../../nodes/Set/Set.node';
import { NoOp } from '../../../nodes/NoOp/NoOp.node';

describe('Execute Switch Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute Switch node with expression',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/Switch/test/switch.expression.workflow.json'),
			},
			output: {
				nodeData: {
					'Output 0': [
						[
							{
								propertyName: 'test',
							},
						],
					],
				},
			},
		},
		{
			description: 'should execute Switch node with rules',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/Switch/test/switch.rules.workflow.json'),
			},
			output: {
				nodeData: {
					'Output 0': [
						[
							{
								propertyName: 'test',
							},
						],
					],
				},
			},
		},
	];

	const nodes: INodeType[] = [new ManualTrigger(), new Set(), new Switch(), new NoOp()];
	const nodeTypes = Helpers.setup(nodes);

	for (const testData of tests) {
		// eslint-disable-next-line @typescript-eslint/no-loop-func
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
