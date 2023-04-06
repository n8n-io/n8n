import * as Helpers from '../../test/nodes/Helpers';
import { executeWorkflow } from '../../test/nodes/ExecuteWorkflow';
import type { WorkflowTestData } from '../../test/nodes/types';

jest.mock('otpauth', () => {
	return {
		TOTP: jest.fn().mockImplementation(() => {
			return {
				generate: jest.fn().mockReturnValue('123456'),
			};
		}),
	};
});

jest.mock('n8n-core', () => {
	return {
		...jest.requireActual('n8n-core'),
		getCredentials: jest
			.fn()
			.mockReturnValue({ label: 'GitHub:john-doe', secret: 'BVDRSBXQB2ZEL5HE' }),
	};
});

describe('Execute TOTP node', () => {
	const tests: Array<WorkflowTestData> = [
		{
			description: 'List Airtable Records',
			input: {
				workflowData: Helpers.readJsonFileSync('nodes/Totp/Totp.workflow.test.json'),
			},
			output: {
				nodeData: {
					TOTP: [[{ json: { token: '123456', secondsRemaining: 30 } }]],
				},
			},
		},
	];

	const nodeTypes = Helpers.setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => {
			const { result } = await executeWorkflow(testData, nodeTypes);
			console.log('result', result);

			Helpers.getResultNodeData(result, testData).forEach(({ nodeName, resultData }) => {
				console.log('resultData', resultData);
				console.log('testData.output.nodeData[nodeName]', testData.output.nodeData[nodeName]);
				expect(resultData).toEqual(testData.output.nodeData[nodeName]);
			});

			expect(result.finished).toEqual(true);
		});
	}

	// test('should mock a token', () => {
	// 	const token = new OTPAuth.TOTP().generate();
	// 	console.log('token', token);
	// });
});
