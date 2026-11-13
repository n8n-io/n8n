import type { IHookFunctions, ILoadOptionsFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { getCollections, getFields, getSites } from '../GenericFunctions';
import { WebflowTriggerV1 } from '../V1/WebflowTriggerV1.node';
import { WebflowTriggerV2 } from '../V2/WebflowTriggerV2.node';

const siteId = '580e63e98c9a982ac9b8b741';
const collectionId = '580e63fc8c9a982ac9b8b745';
const webhookId = '57ca0a9e418c504a6e1acbb6';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Webflow Trigger',
	name: 'webflowTrigger',
	group: ['trigger'],
	description: 'Handle Webflow events via webhooks',
};

describe('Webflow request URLs', () => {
	describe.each([
		{ typeVersion: 1, trigger: new WebflowTriggerV1(baseDescription), prefix: '' },
		{ typeVersion: 2, trigger: new WebflowTriggerV2(baseDescription), prefix: '/v2' },
	])('Webflow Trigger v$typeVersion', ({ typeVersion, trigger, prefix }) => {
		const setup = (response: unknown) => {
			const context = mockDeep<IHookFunctions>();
			context.getNode.mockReturnValue({
				id: '1',
				name: 'Webflow Trigger',
				type: 'n8n-nodes-base.webflowTrigger',
				typeVersion,
				position: [0, 0],
				parameters: {},
			});
			context.getNodeParameter.mockImplementation((name: string) =>
				name === 'site' ? siteId : name === 'event' ? 'form_submission' : 'accessToken',
			);
			context.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/1');
			context.getWorkflowStaticData.mockReturnValue({ webhookId });
			context.helpers.httpRequestWithAuthentication.mockResolvedValue(response);
			return context;
		};

		const requestedUrl = (context: IHookFunctions) =>
			String(jest.mocked(context.helpers.httpRequestWithAuthentication).mock.calls[0][1].url);

		it('should request the site webhooks', async () => {
			const context = setup([]);
			await trigger.webhookMethods.default.checkExists.call(context);
			expect(requestedUrl(context)).toBe(
				`https://api.webflow.com${prefix}/sites/${siteId}/webhooks`,
			);
		});

		it('should create the webhook on the site', async () => {
			const context = setup({ _id: webhookId });
			await trigger.webhookMethods.default.create.call(context);
			expect(requestedUrl(context)).toBe(
				`https://api.webflow.com${prefix}/sites/${siteId}/webhooks`,
			);
		});

		it('should delete the webhook', async () => {
			const context = setup({ deleted: 1 });
			await trigger.webhookMethods.default.delete.call(context);
			expect(requestedUrl(context)).toBe(
				`https://api.webflow.com${prefix}/sites/${siteId}/webhooks/${webhookId}`,
			);
		});
	});

	describe('load options', () => {
		const setup = () => {
			const context = mockDeep<ILoadOptionsFunctions>();
			context.getNode.mockReturnValue({
				id: '1',
				name: 'Webflow',
				type: 'n8n-nodes-base.webflow',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			});
			context.getCurrentNodeParameter.mockImplementation((name: string) =>
				name === 'siteId' ? siteId : collectionId,
			);
			context.helpers.httpRequestWithAuthentication.mockResolvedValue({
				body: { sites: [], collections: [], fields: [] },
			});
			return context;
		};

		it.each([
			{ name: 'getSites', fn: getSites, url: 'https://api.webflow.com/v2/sites' },
			{
				name: 'getCollections',
				fn: getCollections,
				url: `https://api.webflow.com/v2/sites/${siteId}/collections`,
			},
			{
				name: 'getFields',
				fn: getFields,
				url: `https://api.webflow.com/v2/collections/${collectionId}`,
			},
		])('$name should request $url', async ({ fn, url }) => {
			const context = setup();
			await fn.call(context);
			expect(
				String(jest.mocked(context.helpers.httpRequestWithAuthentication).mock.calls[0][1].url),
			).toBe(url);
		});
	});
});
