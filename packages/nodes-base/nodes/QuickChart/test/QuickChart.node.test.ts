import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

describe('Test QuickChart Node', () => {
	beforeEach(async () => {
		nock('https://quickchart.io')
			.persist()
			.get(/chart.*/)
			.reply(200, { success: true });
	});

	const testHarness = new NodeTestHarness();
	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/QuickChart/test/QuickChart.workflow.json',
			input: {
				workflowData: testHarness.readWorkflowJSON('QuickChart.workflow.json'),
			},
			output: {
				nodeData: {
					BarChart: [
						[
							{
								json: {
									chart: {
										type: 'horizontalBar',
										data: {
											labels: ['Q1', 'Q2', 'Q3', 'Q4'],
											datasets: [
												{
													label: 'Free Users',
													data: [50, 60, 70, 180],
													backgroundColor: '#121d6d77',
													borderColor: '#e81010',
													type: 'horizontalBar',
												},
												{
													label: 'Paid Users',
													data: [30, 10, 14, 25],
													backgroundColor: '#0c0d0d96',
													borderColor: '#e81010',
													type: 'horizontalBar',
												},
											],
										},
									},
								},
							},
						],
					],
					Doughnut: [
						[
							{
								json: {
									chart: {
										type: 'doughnut',
										data: {
											labels: ['Q1', 'Q2', 'Q3', 'Q4'],
											datasets: [
												{
													label: 'Free Users',
													data: [50, 60, 70, 180],
													backgroundColor: '#121d6d77',
													borderColor: '#e81010',
													type: 'doughnut',
												},
												{
													label: 'Paid Users',
													data: [30, 10, 14, 25],
													backgroundColor: '#0c0d0d96',
													borderColor: '#e81010',
													type: 'doughnut',
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
