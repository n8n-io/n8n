import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { router } from '../../../v2/actions/router';
import * as transport from '../../../v2/transport';

vi.mock('../../../v2/transport', () => ({
	splunkApiJsonRequest: vi.fn(),
	splunkApiRequest: vi.fn(),
}));

describe('Splunk, router', () => {
	test('returns an error item for an invalid user ID when continue on fail is on', async () => {
		const executeFunctions = mock<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		const parameters: Record<string, string> = { resource: 'user', operation: 'get', userId: '..' };
		executeFunctions.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		executeFunctions.continueOnFail.mockReturnValue(true);

		const result = await router.call(executeFunctions);

		expect(transport.splunkApiJsonRequest).not.toHaveBeenCalled();
		expect(result).toEqual([[{ json: { error: expect.any(String) }, pairedItem: { item: 0 } }]]);
	});
});
