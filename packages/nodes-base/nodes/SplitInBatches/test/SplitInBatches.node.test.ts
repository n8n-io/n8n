import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';

describe('Execute SplitinBatches Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute SplitinBatches node',
			input: {
				workflowData: Helpers.readJsonFileSync(
					'nodes/SplitInBatches/test/SplitInBatches.workflow.json',
				),
			},
			output: {
				nodeData: {
					Output: [
						[
							{
								data: 'test',
								maxRunIndex: 2,
								propertyName: 1,
							},
						],
					],
				},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

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
