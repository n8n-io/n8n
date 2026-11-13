import type { IExecuteFunctions, IHookFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { execute as getItem } from '../V2/actions/Item/get.operation';
import { WebflowTriggerV1 } from '../V1/WebflowTriggerV1.node';
import { WebflowV1 } from '../V1/WebflowV1.node';
import { WebflowTriggerV2 } from '../V2/WebflowTriggerV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Webflow',
	name: 'webflow',
	group: ['transform'],
	description: 'Consume the Webflow API',
};

const node = (typeVersion: number) => ({
	id: '1',
	name: 'Webflow',
	type: 'n8n-nodes-base.webflow',
	typeVersion,
	position: [0, 0] as [number, number],
	parameters: {},
});

const parameters: Record<string, string> = {
	resource: 'item',
	operation: 'get',
	authentication: 'accessToken',
	collectionId: '580e63fc8c9a982ac9b8b745',
	itemId: '580e6400/8c9a982a',
	site: '580e63e9/8c9a982a',
	event: 'form_submission',
};

const requestedUrl = (context: IExecuteFunctions | IHookFunctions) =>
	String(jest.mocked(context.helpers.httpRequestWithAuthentication).mock.calls[0][1].url);

describe('Webflow path encoding', () => {
	const executeContext = (typeVersion: number) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node(typeVersion));
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({ body: {}, items: [] });
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		return context;
	};

	it('should encode an item ID that contains a slash in Webflow v2', async () => {
		const context = executeContext(2);
		await getItem.call(context, [{ json: {} }]);
		expect(requestedUrl(context)).toBe(
			'https://api.webflow.com/v2/collections/580e63fc8c9a982ac9b8b745/items/580e6400%2F8c9a982a',
		);
	});

	it('should encode an item ID that contains a slash in Webflow v1', async () => {
		const context = executeContext(1);
		await new WebflowV1(baseDescription).execute.call(context);
		expect(requestedUrl(context)).toBe(
			'https://api.webflow.com/collections/580e63fc8c9a982ac9b8b745/items/580e6400%2F8c9a982a',
		);
	});

	it.each([
		{ typeVersion: 1, trigger: new WebflowTriggerV1(baseDescription), prefix: '' },
		{ typeVersion: 2, trigger: new WebflowTriggerV2(baseDescription), prefix: '/v2' },
	])(
		'should encode a site ID that contains a slash in Webflow Trigger v$typeVersion',
		async ({ typeVersion, trigger, prefix }) => {
			const context = mockDeep<IHookFunctions>();
			context.getNode.mockReturnValue(node(typeVersion));
			context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
			context.getWorkflowStaticData.mockReturnValue({});
			context.helpers.httpRequestWithAuthentication.mockResolvedValue([]);
			await trigger.webhookMethods.default.checkExists.call(context);
			expect(requestedUrl(context)).toBe(
				`https://api.webflow.com${prefix}/sites/580e63e9%2F8c9a982a/webhooks`,
			);
		},
	);
});
