import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';

import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';

describe('Execute If Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute IF node true/false boolean',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/If/test/workflow.json'),
			},
			output: {
				nodeData: {
					'On True': [
						[
							{
								value: true,
							},
						],
					],
					'On False': [
						[
							{
								value: false,
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
