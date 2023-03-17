/* eslint-disable @typescript-eslint/no-loop-func */
import * as Helpers from '../../../test/nodes/Helpers';
import type { WorkflowTestData } from '../../../test/nodes/types';
import { executeWorkflow } from '../../../test/nodes/ExecuteWorkflow';
import nock from 'nock';

describe('Test QuickChart Node', () => {
	beforeEach(async () => {
		await Helpers.initBinaryDataManager();
		nock.disableNetConnect();
		nock('https://quickchart.io')
			.persist()
			.get(/chart.*/)
			.reply(200, { success: true });
	});

	afterEach(() => {
		nock.restore();
	});

	const workflow = Helpers.readJsonFileSync('nodes/QuickChart/test/QuickChart.workflow.json');

	const tests: WorkflowTestData[] = [
		{
			description: 'nodes/QuickChart/test/QuickChart.workflow.json',
			input: {
				workflowData: workflow,
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

	const nodeTypes = Helpers.setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			const resultNodeData = Helpers.getResultNodeData(result, testData);
			resultNodeData.forEach(({ nodeName, resultData }) => {
				delete resultData[0]![0].binary;
				expect(resultData).toEqual(testData.output.nodeData[nodeName]);
			});
			expect(result.finished).toEqual(true);
		});
	}
});
