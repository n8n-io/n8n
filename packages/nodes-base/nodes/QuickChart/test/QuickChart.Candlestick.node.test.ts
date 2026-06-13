import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

describe('Test QuickChart Node for Candlestick chart', () => {
	beforeEach(async () => {
		nock('https://quickchart.io')
			.persist()
			.get(/chart.*/)
			.reply(200, { success: true });
	});

	const testHarness = new NodeTestHarness();

	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/QuickChart/test/QuickChart.Candlestick.workflow.json',
			input: {
				workflowData: testHarness.readWorkflowJSON('QuickChart.Candlestick.workflow.json'),
			},
			output: {
				nodeData: {
					Candlestick: [
						[
							{
								json: {
									chart: {
										type: 'candlestick',
										data: {
											labels: ['Data'],
											datasets: [
												{
													label: 'Chart',
													data: [
														{ x: 1459468800000, o: 18.23, h: 19.36, l: 18.18, c: 19.31 },
														{ x: 1459555200000, o: 19.5, h: 19.89, l: 19, c: 19.29 },
														{ x: 1459641600000, o: 19.13, h: 19.15, l: 18.43, c: 18.75 },
														{ x: 1459900800000, o: 18.54, h: 18.76, l: 18.27, c: 18.76 },
														{ x: 1459987200000, o: 18.76, h: 19.14, l: 18.63, c: 18.76 },
													],
													backgroundColor: '#121d6d77',
													borderColor: '#e81010',
													type: 'candlestick',
												},
											],
										},
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
