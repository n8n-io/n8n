import * as Helpers from '../Helpers';
import { WorkflowTestData } from '../types';
import { executeWorkflow } from '../ExecuteWorkflow';

describe('Execute If Node', () => {
	const tests: Array<WorkflowTestData> = [
		{
			description: 'should execute IF node true/false boolean',
			input: {
				workflowData: Helpers.readJsonFileSync('test/nodes/If/workflow.json'),
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
