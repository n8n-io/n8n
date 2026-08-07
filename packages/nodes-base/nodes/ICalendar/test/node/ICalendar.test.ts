import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import * as ics from 'ics';
import type { WorkflowTestData } from 'n8n-workflow';

// The harness loads the node from dist via require(), so vi.mock cannot intercept its `ics`
// import. `ics` is externalized, so the test and the node share the same instance — spy on it
// to pin the otherwise-random uid and timestamp.
const realCreateEvent = ics.createEvent;

describe('iCalendar Node', () => {
	beforeEach(() => {
		vi.spyOn(ics, 'createEvent').mockImplementation(((attributes: any, cb: any) => {
			attributes.uid = 'test-uid';
			attributes.timestamp = '20250424T135100Z';
			return realCreateEvent(attributes, cb);
		}) as typeof ics.createEvent);
	});

	const testHarness = new NodeTestHarness();
	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/ICalendar/test/node/workflow.iCalendar.json',
			input: {
				workflowData: testHarness.readWorkflowJSON('workflow.iCalendar.json'),
			},
			output: {
				assertBinaryData: true,
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
										data: 'QkVHSU46VkNBTEVOREFSDQpWRVJTSU9OOjIuMA0KQ0FMU0NBTEU6R1JFR09SSUFODQpQUk9ESUQ6YWRhbWdpYmJvbnMvaWNzDQpNRVRIT0Q6UFVCTElTSA0KWC1XUi1DQUxOQU1FOmRlZmF1bHQNClgtUFVCTElTSEVELVRUTDpQVDFIDQpCRUdJTjpWRVZFTlQNClVJRDp0ZXN0LXVpZA0KU1VNTUFSWTpuZXcgZXZlbnQNCkRUU1RBTVA6MjAyNTA0MjRUMTM1MTAwWg0KRFRTVEFSVDtWQUxVRT1EQVRFOjIwMjMwMjI3DQpEVEVORDtWQUxVRT1EQVRFOjIwMjMwMjI4DQpBVFRFTkRFRTtSU1ZQPUZBTFNFO0NOPVBlcnNvbjptYWlsdG86cGVyc29uMUBlbWFpbC5jb20NCkVORDpWRVZFTlQNCkVORDpWQ0FMRU5EQVINCg==',
										fileName: 'event.ics',
										fileSize: '346 B',
									},
								},
							},
						],
					],
				},
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
