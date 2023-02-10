/* eslint-disable @typescript-eslint/no-loop-func */
import type { WorkflowTestData } from '../../../../test/nodes/types';

import {
	getResultNodeData,
	setup,
	readJsonFileSync,
	initBinaryDataManager,
} from '../../../../test/nodes/Helpers';
import { executeWorkflow } from '../../../../test/nodes/ExecuteWorkflow';

describe('Execute iCalendar Node', () => {
	beforeEach(async () => {
		await initBinaryDataManager();
	});
	const workflowData = readJsonFileSync('nodes/ICalendar/test/node/workflow.iCalendar.json');

	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/ICalendar/test/node/workflow.iCalendar.json',
			input: {
				workflowData,
			},
			output: {
				nodeData: {
					iCalendar: [
						[
							{
								json: {},
								binary: {
									data: {
										mimeType: 'text/calendar',
										fileType: 'text',
										fileExtension: 'ics',
										data: 'QkVHSU46VkNBTEVOREFSDQpWRVJTSU9OOjIuMA0KQ0FMU0NBTEU6R1JFR09SSUFODQpQUk9ESUQ6YWRhbWdpYmJvbnMvaWNzDQpNRVRIT0Q6UFVCTElTSA0KWC1XUi1DQUxOQU1FOmRlZmF1bHQNClgtUFVCTElTSEVELVRUTDpQVDFIDQpCRUdJTjpWRVZFTlQNClVJRDpMWC1zckVYdkI1MXA1ZUxNS1gwTnkNClNVTU1BUlk6bmV3IGV2ZW50DQpEVFNUQU1QOjIwMjMwMjEwVDA5MzYwMFoNCkRUU1RBUlQ7VkFMVUU9REFURToyMDIzMDIyOA0KRFRFTkQ7VkFMVUU9REFURToyMDIzMDMwMQ0KQVRURU5ERUU7UlNWUD1GQUxTRTtDTj1QZXJzb246bWFpbHRvOnBlcnNvbjFAZW1haWwuY29tDQpFTkQ6VkVWRU5UDQpFTkQ6VkNBTEVOREFSDQo=',
										fileName: 'event.ics',
										fileSize: '359 B',
									},
								},
							},
						],
					],
				},
			},
		},
	];

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			const resultNodeData = getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) => {
				//@ts-ignore
				expect(resultData[0][0].binary.data.data.length).toEqual(
					testData.output.nodeData[nodeName][0][0].binary.data.data.length,
				);

				//uid every time would be different, so we need to delete it in order to compare objects
				//@ts-ignore
				delete resultData[0][0].binary.data.data;
				delete testData.output.nodeData[nodeName][0][0].binary.data.data;

				expect(resultData).toEqual(testData.output.nodeData[nodeName]);
			});

			expect(result.finished).toEqual(true);
		});
	}
});
