import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions } from 'n8n-workflow';

import { MailjetTrigger } from '../MailjetTrigger.node';

describe('MailjetTrigger', () => {
	it('should return false in delete when no webhook ID is stored', async () => {
		const hookFunctions = mockDeep<IHookFunctions>();
		hookFunctions.getWorkflowStaticData.mockReturnValue({});

		await expect(
			new MailjetTrigger().webhookMethods.default.delete.call(hookFunctions),
		).resolves.toBe(false);

		expect(hookFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
