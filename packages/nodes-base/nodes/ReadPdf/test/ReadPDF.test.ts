/* eslint-disable @typescript-eslint/no-loop-func */
import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';
import path from 'path';

describe('Test Read PDF Node', () => {
	beforeEach(async () => {
		await Helpers.initBinaryDataManager();
	});

	const workflow = Helpers.readJsonFileSync('nodes/ReadPdf/test/ReadPDF.workflow.json');
	const node = workflow.nodes.find((n: any) => n.name === 'Read Binary File');
	node.parameters.filePath = path.join(__dirname, 'sample.pdf');

	const testData: WorkflowTestData = {
		description: 'nodes/ReadPdf/test/ReadPDF.workflow.json',
		input: {
			workflowData: workflow,
		},
		output: {
			nodeData: {
				'Read PDF': [
					[
						{
							json: {
								numpages: 1,
								numrender: 1,
								info: {
									PDFFormatVersion: '1.4',
									IsAcroFormPresent: false,
									IsXFAPresent: false,
									Title: 'sample',
									Producer: 'iLovePDF',
									ModDate: 'D:20230210122750Z',
								},
								metadata: null,
								text: '\n\nN8N\nSample PDF\nLorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor\ninvidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et\njusto duo dolores et ea rebum.',
								version: '1.10.100',
							},
						},
					],
				],
			},
		},
	};

	const nodeTypes = Helpers.setup(testData);

	test(testData.description, async () => {
		const { result } = await executeWorkflow(testData, nodeTypes);
		const resultNodeData = Helpers.getResultNodeData(result, testData);

		// delete binary data because we test against json only
		delete resultNodeData[0].resultData[0]![0].binary;
		expect(resultNodeData[0].resultData).toEqual(testData.output.nodeData['Read PDF']);

		expect(result.finished).toEqual(true);
	});
});
