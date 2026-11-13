import { createHmac } from 'crypto';
import { EventEmitter } from 'events';
import type { Request } from 'express';
import { mockDeep } from 'jest-mock-extended';
import type {
	IHookFunctions,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
} from 'n8n-workflow';

import { SurveyMonkeyTrigger } from '../SurveyMonkeyTrigger.node';

const baseUrl = 'https://api.surveymonkey.com/v3';
const surveyId = '406120585';
const collectorId = '413745129';
const responseId = '118874784191';
const webhookId = '7230712';
const webhookUrl = 'https://n8n.example.com/webhook/surveymonkey';

type Context = IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions;

const parameters: Record<string, unknown> = {
	authentication: 'accessToken',
	objectType: 'survey',
	event: 'response_completed',
	surveyIds: [surveyId],
	resolveData: true,
	onlyAnswers: false,
};

function withParameters<T extends Context>(context: T) {
	jest
		.mocked(context.getNodeParameter as (name: string) => unknown)
		.mockImplementation((name) => parameters[name]);
	jest.mocked(context.getCredentials).mockResolvedValue({
		accessToken: 'fake-access-token',
		clientId: 'client-id',
		clientSecret: 'client-secret',
	});
	return context;
}

function requestedUrls(context: Context) {
	return jest.mocked(context.helpers.request).mock.calls.map(([options]) => {
		const { method, uri } = options as IRequestOptions;
		return `${method} ${String(uri)}`;
	});
}

describe('SurveyMonkeyTrigger > Request URLs', () => {
	const trigger = new SurveyMonkeyTrigger();

	it('should list webhooks, follow the next page link and get each webhook', async () => {
		const context = withParameters(mockDeep<IHookFunctions>());
		context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		context.getWorkflowStaticData.mockReturnValue({});
		context.helpers.request
			.mockResolvedValueOnce({
				data: [],
				links: { next: `${baseUrl}/webhooks?page=2&per_page=100` },
			})
			.mockResolvedValueOnce({ data: [{ id: webhookId }], links: {} })
			.mockResolvedValueOnce({
				subscription_url: webhookUrl,
				object_ids: [surveyId],
				event_type: 'response_completed',
			});

		const exists = await trigger.webhookMethods.default.checkExists.call(context);

		expect(exists).toBe(true);
		expect(requestedUrls(context)).toEqual([
			`GET ${baseUrl}/webhooks`,
			`GET ${baseUrl}/webhooks?page=2&per_page=100`,
			`GET ${baseUrl}/webhooks/${webhookId}`,
		]);
	});

	it('should create and delete the webhook', async () => {
		const context = withParameters(mockDeep<IHookFunctions>());
		context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		const staticData = {};
		context.getWorkflowStaticData.mockReturnValue(staticData);
		context.helpers.request.mockResolvedValue({ id: webhookId });

		await trigger.webhookMethods.default.create.call(context);
		await trigger.webhookMethods.default.delete.call(context);

		expect(requestedUrls(context)).toEqual([
			`POST ${baseUrl}/webhooks`,
			`DELETE ${baseUrl}/webhooks/${webhookId}`,
		]);
	});

	it('should load the collectors of a survey', async () => {
		const context = withParameters(mockDeep<ILoadOptionsFunctions>());
		context.getCurrentNodeParameter.mockReturnValue(surveyId);
		context.helpers.request.mockResolvedValue({
			data: [{ id: collectorId, name: 'Web Link' }],
			links: {},
		});

		const collectors = await trigger.methods.loadOptions.getCollectors.call(context);

		expect(collectors).toEqual([{ name: 'Web Link', value: collectorId }]);
		expect(requestedUrls(context)).toEqual([`GET ${baseUrl}/surveys/${surveyId}/collectors`]);
	});

	describe('webhook', () => {
		const runWebhook = async (objectType: string) => {
			const context = withParameters(mockDeep<IWebhookFunctions>());
			context.getNodeParameter.mockImplementation(
				(name: string) => (name === 'objectType' ? objectType : parameters[name]) as never,
			);
			const body = JSON.stringify({
				object_id: responseId,
				resources: { survey_id: surveyId, collector_id: collectorId },
			});
			const signature = createHmac('sha1', 'client-id&client-secret').update(body).digest('base64');
			const request = new EventEmitter();
			context.getRequestObject.mockReturnValue(request as unknown as Request);
			context.getWebhookName.mockReturnValue('default');
			context.getHeaderData.mockReturnValue({ 'sm-signature': signature });
			context.helpers.request
				.mockResolvedValueOnce({ survey_id: surveyId, pages: [] })
				.mockResolvedValueOnce({ pages: [] });

			const result = trigger.webhook.call(context);
			for (let i = 0; i < 100 && request.listenerCount('end') !== 1; i++) {
				await new Promise((resolve) => setImmediate(resolve));
			}
			expect(request.listenerCount('end')).toBe(1);
			request.emit('data', Buffer.from(body));
			request.emit('end');
			await result;

			return requestedUrls(context);
		};

		it('should get the survey response details', async () => {
			expect(await runWebhook('survey')).toEqual([
				`GET ${baseUrl}/surveys/${surveyId}/responses/${responseId}/details`,
				`GET ${baseUrl}/surveys/${surveyId}/details`,
			]);
		});

		it('should get the collector response details', async () => {
			expect(await runWebhook('collector')).toEqual([
				`GET ${baseUrl}/collectors/${collectorId}/responses/${responseId}/details`,
				`GET ${baseUrl}/surveys/${surveyId}/details`,
			]);
		});
	});
});
