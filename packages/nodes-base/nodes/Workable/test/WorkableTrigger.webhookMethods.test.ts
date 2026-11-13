import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { WorkableTrigger } from '../WorkableTrigger.node';

const credentials = { accessToken: 'fake-access-token', subdomain: 'acme' };

describe('WorkableTrigger', () => {
	describe('webhookMethods', () => {
		let context: ReturnType<typeof mockDeep<IHookFunctions>>;
		let webhookData: IDataObject;

		beforeEach(() => {
			context = mockDeep<IHookFunctions>();
			webhookData = { webhookId: '5f7c1a2b' };
			context.getCredentials.mockResolvedValue(credentials);
			context.getWorkflowStaticData.mockReturnValue(webhookData);
			context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/workable');
			context.getNodeParameter.mockImplementation((name: string) =>
				name === 'filters' ? {} : 'candidateCreated',
			);
		});

		const requested = () => context.helpers.request.mock.calls[0][0] as IRequestOptions;

		it('should list the subscriptions in checkExists', async () => {
			context.helpers.request.mockResolvedValue({ subscriptions: [] });

			await new WorkableTrigger().webhookMethods.default.checkExists.call(context);

			expect(String(requested().uri)).toBe('https://acme.workable.com/spi/v3/subscriptions');
			expect(requested().method).toBe('GET');
		});

		it('should post a subscription in create', async () => {
			context.helpers.request.mockResolvedValue({ id: '5f7c1a2b' });

			await new WorkableTrigger().webhookMethods.default.create.call(context);

			expect(String(requested().uri)).toBe('https://acme.workable.com/spi/v3/subscriptions');
			expect(requested().method).toBe('POST');
		});

		it('should delete the subscription in delete', async () => {
			context.helpers.request.mockResolvedValue({});

			const result = await new WorkableTrigger().webhookMethods.default.delete.call(context);

			expect(result).toBe(true);
			expect(String(requested().uri)).toBe(
				'https://acme.workable.com/spi/v3/subscriptions/5f7c1a2b',
			);
			expect(requested().method).toBe('DELETE');
		});
	});

	describe('loadOptions', () => {
		it.each([
			['getJobs', { jobs: [] }, 'https://acme.workable.com/spi/v3/jobs'],
			['getStages', { stages: [] }, 'https://acme.workable.com/spi/v3/stages'],
		] as const)('should request %s', async (method, response, url) => {
			const context = mockDeep<ILoadOptionsFunctions>();
			context.getCredentials.mockResolvedValue(credentials);
			context.helpers.request.mockResolvedValue(response);

			await new WorkableTrigger().methods.loadOptions[method].call(context);

			const options = context.helpers.request.mock.calls[0][0] as IRequestOptions;
			expect(String(options.uri)).toBe(url);
		});
	});
});
