import { mockDeep } from 'jest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
} from 'n8n-workflow';

import { JotFormTrigger } from '../JotFormTrigger.node';

const formId = '251234567890123';
const webhookUrl = 'https://n8n.example.com/webhook/jotform';
const credentials = { apiKey: 'fake-api-key', apiDomain: 'eu-api.jotform.com' };

const requestedUrl = (request: { mock: { calls: unknown[][] } }) => {
	const [options] = request.mock.calls[0] as [IRequestOptions];
	return String(options.uri);
};

describe('JotFormTrigger Node', () => {
	const node = new JotFormTrigger();

	describe('loadOptions.getForms', () => {
		it.each([
			[credentials, 'https://eu-api.jotform.com/user/forms'],
			[{ apiKey: 'fake-api-key' }, 'https://api.jotform.com/user/forms'],
		])('should request the forms of the API domain', async (data, url) => {
			const context = mockDeep<ILoadOptionsFunctions>();
			context.getCredentials.mockResolvedValue(data as ICredentialDataDecryptedObject);
			context.helpers.request.mockResolvedValue({ content: [{ id: formId, title: 'Contact' }] });

			const forms = await node.methods.loadOptions.getForms.call(context);

			expect(forms).toEqual([{ name: 'Contact', value: formId }]);
			expect(requestedUrl(context.helpers.request)).toBe(url);
		});
	});

	describe('webhookMethods', () => {
		const setup = (webhookData: IDataObject = {}) => {
			const context = mockDeep<IHookFunctions>();
			context.getCredentials.mockResolvedValue(credentials);
			context.getNodeParameter.mockReturnValue(formId);
			context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			context.getWorkflowStaticData.mockReturnValue(webhookData);
			return context;
		};

		it('checkExists should request the webhooks of the form', async () => {
			const context = setup();
			context.helpers.request.mockResolvedValue({ content: { '3': webhookUrl } });

			expect(await node.webhookMethods.default.checkExists.call(context)).toBe(true);
			expect(requestedUrl(context.helpers.request)).toBe(
				`https://eu-api.jotform.com/form/${formId}/webhooks`,
			);
		});

		it('create should post the webhook to the form', async () => {
			const context = setup();
			context.helpers.request.mockResolvedValue({ content: { '3': webhookUrl } });

			expect(await node.webhookMethods.default.create.call(context)).toBe(true);
			expect(requestedUrl(context.helpers.request)).toBe(
				`https://eu-api.jotform.com/form/${formId}/webhooks`,
			);
		});

		it('delete should delete the webhook of the form', async () => {
			const context = setup({ webhookId: '3' });
			context.helpers.request.mockResolvedValue({ message: 'success' });

			expect(await node.webhookMethods.default.delete.call(context)).toBe(true);
			expect(requestedUrl(context.helpers.request)).toBe(
				`https://eu-api.jotform.com/form/${formId}/webhooks/3`,
			);
		});
	});

	describe('webhook', () => {
		it('should request the questions of the form to resolve the data', async () => {
			const context = mockDeep<IWebhookFunctions>();
			context.getCredentials.mockResolvedValue(credentials);
			context.getNodeParameter.mockImplementation((name) => (name === 'form' ? formId : true));
			context.getRequestObject.mockReturnValue({
				body: { data: { rawRequest: JSON.stringify({ q3_name: 'Nathan' }) } },
			} as never);
			context.helpers.request.mockResolvedValue({
				content: { '3': { name: 'name', text: 'Name' } },
			});
			context.helpers.returnJsonArray.mockImplementation((data) => [{ json: data as never }]);

			const result = await node.webhook.call(context);

			expect(result.workflowData).toEqual([[{ json: { Name: 'Nathan' } }]]);
			expect(requestedUrl(context.helpers.request)).toBe(
				`https://eu-api.jotform.com/form/${formId}/questions`,
			);
		});
	});
});
