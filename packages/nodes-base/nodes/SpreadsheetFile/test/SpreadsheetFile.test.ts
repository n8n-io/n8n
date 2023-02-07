import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';

import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';
import path from 'path';

describe('Execute Spreadsheet File Node', () => {
	beforeEach(async () => {
		await Helpers.initBinaryDataManager();
	});

	const workflow = Helpers.readJsonFileSync('nodes/SpreadsheetFile/test/workflow.json');
	const readBinaryFile = workflow.nodes.find((n: any) => n.name === 'Read Binary File');
	const testCsvPath = path.join(__dirname, 'test.csv');
	readBinaryFile.parameters.filePath = testCsvPath;

	// console.log(JSON.stringify(workflow, null, 2));

	const tests: WorkflowTestData[] = [
		{
			description: 'should execute IF node true/false boolean',
			input: {
				workflowData: workflow,
			},
			output: {
				nodeData: {
					'Read From File': [
						[
							{
								A: 1,
								B: 2,
								C: 3,
							},
							{
								A: 4,
								B: 5,
								C: 6,
							},
						],
					],
					'Write To File': [
						[
							{
								data: {
									mimeType: 'text/csv',
									fileType: 'text',
									fileExtension: 'csv',
									data: '77u/QSxCLEMKMSwyLDMKNCw1LDYK',
									fileName: 'spreadsheet.csv',
									fileSize: '21 B',
								},
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

			// console.log('result', JSON.stringify(result, null, 2));
			expect(result.finished).toEqual(true);
		});
	}
});
