import type { IExecuteFunctions, IHookFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { KoBoToolbox } from '../KoBoToolbox.node';
import { KoBoToolboxTrigger } from '../KoBoToolboxTrigger.node';

const credentials = { URL: 'https://kf.kobotoolbox.org/', token: 'fake-token' };
const formId = 'aZLQ9vAWYa3qFKtq5WwUvS/data?x=1';
const encodedFormId = 'aZLQ9vAWYa3qFKtq5WwUvS%2Fdata%3Fx=1';

const expectUrl = (value: string) =>
	expect.objectContaining({ url: expect.objectContaining({ value }) });

describe('KoBoToolbox request URLs', () => {
	it('should encode the form ID in the request URL of the node', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'resource' ? 'form' : name === 'operation' ? 'get' : formId,
		);
		context.getCredentials.mockResolvedValue(credentials);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({ uid: formId });
		context.helpers.returnJsonArray.mockReturnValue([]);

		await new KoBoToolbox().execute.call(context);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'koBoToolboxApi',
			expectUrl(`https://kf.kobotoolbox.org/api/v2/assets/${encodedFormId}`),
		);
	});

	it('should encode the form ID in the request URL of the trigger node', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getWorkflowStaticData.mockReturnValue({});
		context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/kobo');
		context.getNodeParameter.mockReturnValue(formId);
		context.getCredentials.mockResolvedValue(credentials);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue([]);

		await new KoBoToolboxTrigger().webhookMethods.default.checkExists.call(context);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'koBoToolboxApi',
			expectUrl(`https://kf.kobotoolbox.org/api/v2/assets/${encodedFormId}/hooks/`),
		);
	});
});
