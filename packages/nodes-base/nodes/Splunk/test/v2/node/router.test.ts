import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { router } from '../../../v2/actions/router';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({
	splunkApiJsonRequest: jest.fn(),
	splunkApiRequest: jest.fn(),
}));

describe('Splunk, router', () => {
	test('throws for an invalid user ID before it sends a request', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		const parameters: Record<string, string> = { resource: 'user', operation: 'get', userId: '..' };
		executeFunctions.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(router.call(executeFunctions)).rejects.toThrow();

		expect(transport.splunkApiJsonRequest).not.toHaveBeenCalled();
	});
});
