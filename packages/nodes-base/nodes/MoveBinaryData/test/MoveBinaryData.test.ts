/* eslint-disable @typescript-eslint/no-loop-func */
import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';
import path from 'path';

describe('Test Move Binary Data Node', () => {
	beforeEach(async () => {
		await Helpers.initBinaryDataManager();
	});

	const workflow = Helpers.readJsonFileSync(
		'nodes/MoveBinaryData/test/MoveBinaryData.workflow.json',
	);
	const node = workflow.nodes.find((n: any) => n.name === 'Read Binary File');
	node.parameters.filePath = path.join(__dirname, 'data', 'sample.json');

	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/MoveBinaryData/test/MoveBinaryData.workflow.json',
			input: {
				workflowData: workflow,
			},
			output: {
				nodeData: {},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

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
