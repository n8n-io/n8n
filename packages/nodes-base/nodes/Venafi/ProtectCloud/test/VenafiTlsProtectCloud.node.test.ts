import { mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { VenafiTlsProtectCloud } from '../VenafiTlsProtectCloud.node';
import { VenafiTlsProtectCloudTrigger } from '../VenafiTlsProtectCloudTrigger.node';

const webhookUrl = 'https://n8n.example.com/webhook/abc';

function requestedUrls(context: IHookFunctions | ILoadOptionsFunctions) {
	return vi
		.mocked(context.helpers.requestWithAuthentication)
		.mock.calls.map(([, options]) => `${options.method} ${String(options.uri)}`);
}

function mockContext<T extends IHookFunctions | ILoadOptionsFunctions>(context: T) {
	vi.mocked(context.getCredentials).mockResolvedValue({ region: 'eu', apiKey: 'fake-api-key' });
	return context;
}

describe('Venafi TLS Protect Cloud request URLs', () => {
	it('should call the connector endpoints for the webhook methods', async () => {
		const context = mockContext(mockDeep<IHookFunctions>());
		context.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		context.getNodeParameter.mockReturnValue('certificate');
		context.getWorkflowStaticData.mockReturnValue({});
		vi.mocked(context.helpers.requestWithAuthentication)
			.mockResolvedValueOnce({
				connectors: [
					{
						id: 'b2c4e6f8-0a1b-4c3d-8e5f-7a9b1c3d5e7f',
						name: `n8n-webhook (${webhookUrl})`,
						status: 'Active',
						properties: { target: { connection: { url: webhookUrl } } },
					},
				],
			})
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ id: 'c3d5f7a9-1b2c-4d4e-9f6a-8b0c2d4e6f8a' })
			.mockResolvedValueOnce({});

		const { webhookMethods } = new VenafiTlsProtectCloudTrigger();
		await webhookMethods.default.checkExists.call(context);
		await webhookMethods.default.create.call(context);
		await webhookMethods.default.delete.call(context);

		expect(requestedUrls(context)).toEqual([
			'GET https://api.venafi.eu/v1/connectors',
			'DELETE https://api.venafi.eu/v1/connectors/b2c4e6f8-0a1b-4c3d-8e5f-7a9b1c3d5e7f',
			'POST https://api.venafi.eu/v1/connectors',
			'DELETE https://api.venafi.eu/v1/connectors/c3d5f7a9-1b2c-4d4e-9f6a-8b0c2d4e6f8a',
		]);
	});

	it('should call the activity type endpoint for the trigger options', async () => {
		const context = mockContext(mockDeep<ILoadOptionsFunctions>());
		context.getCurrentNodeParameter.mockReturnValue('certificate');
		vi.mocked(context.helpers.requestWithAuthentication).mockResolvedValue([
			{ key: 'certificate', readableName: 'Certificate', values: [] },
		]);

		const { loadOptions } = new VenafiTlsProtectCloudTrigger().methods;
		await loadOptions.getActivityTypes.call(context);
		await loadOptions.getActivitySubTypes.call(context);

		expect(requestedUrls(context)).toEqual([
			'GET https://api.venafi.eu/v1/activitytypes',
			'GET https://api.venafi.eu/v1/activitytypes',
		]);
	});

	it('should call the application endpoints for the node options', async () => {
		const context = mockContext(mockDeep<ILoadOptionsFunctions>());
		context.getCurrentNodeParameter.mockReturnValue('6f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0');
		vi.mocked(context.helpers.requestWithAuthentication)
			.mockResolvedValueOnce({ applications: [] })
			.mockResolvedValueOnce({ certificateIssuingTemplateAliasIdMap: {} });

		const { loadOptions } = new VenafiTlsProtectCloud().methods;
		await loadOptions.getApplications.call(context);
		await loadOptions.getCertificateIssuingTemplates.call(context);

		expect(requestedUrls(context)).toEqual([
			'GET https://api.venafi.eu/outagedetection/v1/applications',
			'GET https://api.venafi.eu/outagedetection/v1/applications/6f1e2d3c-4b5a-4968-8776-a5b4c3d2e1f0',
		]);
	});
});
