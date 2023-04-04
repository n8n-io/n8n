/* eslint-disable @typescript-eslint/no-loop-func */
import type { WorkflowTestData } from '../../../../test/nodes/types';
import { executeWorkflow } from '../../../../test/nodes/ExecuteWorkflow';
import * as Helpers from '../../../../test/nodes/Helpers';
import type { IDataObject } from 'n8n-workflow';

describe('Execute Stop and Error Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should run stopAndError node',
			input: {
				workflowData: {
					nodes: [
						{
							parameters: {},
							id: 'b1dcfb89-3dda-4d18-bdd6-c12d8dee70d2',
							name: 'When clicking "Execute Workflow"',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [820, 400],
						},
						{
							parameters: {
								errorType: 'errorObject',
								errorObject: '{\n"code": 404,\n"message": "error object from node"\n}',
							},
							id: '5dae596a-8956-4149-ba9d-36b6b5e80c4a',
							name: 'Stop and Error1',
							type: 'n8n-nodes-base.stopAndError',
							typeVersion: 1,
							position: [1080, 300],
							continueOnFail: true,
						},
						{
							parameters: {
								errorMessage: 'error message from node',
							},
							id: '196ca8fe-994d-46aa-a0ed-bd9beeaa490e',
							name: 'Stop and Error',
							type: 'n8n-nodes-base.stopAndError',
							typeVersion: 1,
							position: [1080, 480],
							continueOnFail: true,
						},
					],
					connections: {
						'When clicking "Execute Workflow"': {
							main: [
								[
									{
										node: 'Stop and Error1',
										type: 'main',
										index: 0,
									},
									{
										node: 'Stop and Error',
										type: 'main',
										index: 0,
									},
								],
							],
						},
					},
				},
			},
			output: {
				nodeExecutionOrder: ['Start'],
				nodeData: {},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);

			expect(result.finished).toBeUndefined();

			const stopAndErrorRunData = result.data.resultData.runData['Stop and Error'];
			const stopAndErrorMessage = (
				(stopAndErrorRunData as unknown as IDataObject[])[0].error as IDataObject
			).message;

			expect(stopAndErrorMessage).toEqual('error message from node');

			const stopAndError1RunData = result.data.resultData.runData['Stop and Error1'];
			const stopAndError1Object = (
				(stopAndError1RunData as unknown as IDataObject[])[0].error as IDataObject
			).cause;

			expect(stopAndError1Object).toEqual({
				code: 404,
				message: 'error object from node',
				name: 'User-thrown error',
			});
		});
	}
});
