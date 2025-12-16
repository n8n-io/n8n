import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

jest.mock('otpauth', () => {
	return {
		TOTP: jest.fn().mockImplementation(() => {
			return {
				generate: jest.fn().mockReturnValue('123456'),
			};
		}),
	};
});

describe('Execute TOTP node', () => {
	const testHarness = new NodeTestHarness();
	const tests: WorkflowTestData[] = [
		{
			description: 'Generate TOTP Token',
			input: {
				workflowData: testHarness.readWorkflowJSON('Totp.workflow.test.json'),
			},
			output: {
				nodeData: {
					// ignore json.secondsRemaining to prevent flakiness
					TOTP: [[{ json: expect.objectContaining({ token: '123456' }) }]],
				},
			},
			credentials: {
				totpApi: {
					label: 'GitHub:john-doe',
					secret: 'BVDRSBXQB2ZEL5HE',
				},
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
