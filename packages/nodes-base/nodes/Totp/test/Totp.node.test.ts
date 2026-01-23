import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import * as OTPAuth from 'otpauth';

describe('Execute TOTP node', () => {
	const testHarness = new NodeTestHarness();

	// Mock Date.now() to return a fixed timestamp for consistent TOTP generation
	const FIXED_TIMESTAMP = 1640000000000; // 2021-12-20T11:33:20.000Z

	beforeAll(() => {
		jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);
	});

	afterAll(() => {
		jest.restoreAllMocks();
	});

	// Pre-calculate expected token using the real OTPAuth library
	// Note: The token value is the same whether label/issuer is present or not,
	// since those fields are metadata and don't affect the TOTP algorithm
	const expectedToken = new OTPAuth.TOTP({
		secret: 'BVDRSBXQB2ZEL5HE',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
	}).generate({ timestamp: FIXED_TIMESTAMP });

	const tests: WorkflowTestData[] = [
		{
			description: 'Generate TOTP Token with label',
			input: {
				workflowData: testHarness.readWorkflowJSON('Totp.workflow.test.json'),
			},
			output: {
				nodeData: {
					TOTP: [[{ json: expect.objectContaining({ token: expectedToken }) }]],
				},
			},
			credentials: {
				totpApi: {
					label: 'GitHub:john-doe',
					secret: 'BVDRSBXQB2ZEL5HE',
				},
			},
		},
		{
			description: 'Generate TOTP Token without label',
			input: {
				workflowData: testHarness.readWorkflowJSON('Totp.workflow.test.json'),
			},
			output: {
				nodeData: {
					// When no label is provided, the node should still generate a valid token
					TOTP: [[{ json: expect.objectContaining({ token: expectedToken }) }]],
				},
			},
			credentials: {
				totpApi: {
					secret: 'BVDRSBXQB2ZEL5HE',
				},
			},
		},
	];

	for (const testData of tests) {
		testHarness.setupTest(testData);
	}
});
