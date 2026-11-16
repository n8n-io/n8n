import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeTypeBaseDescription,
} from 'n8n-workflow';

import { HubspotV1 } from '../V1/HubspotV1.node';
import { HubspotV2 } from '../V2/HubspotV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'HubSpot',
	name: 'hubspot',
	group: ['output'],
	description: 'Consume HubSpot API',
};

const dealPipelines = {
	results: [
		{
			id: 'default',
			label: 'Sales',
			stages: [
				{ id: 'appointmentscheduled', label: 'Appointment Scheduled' },
				{ id: 'closedwon', label: 'Closed Won' },
			],
		},
		{
			id: 'renewals',
			label: 'Renewals',
			stages: [
				{ id: 'renewalreview', label: 'Renewal Review' },
				{ id: 'renewalclosedwon', label: 'Closed Won' },
			],
		},
	],
};

const ticketPipelines = {
	results: [
		{
			id: '0',
			label: 'Support',
			stages: [{ id: '1', label: 'New' }],
		},
		{
			id: '10',
			label: 'Escalations',
			stages: [
				{ id: '11', label: 'Engineering Review' },
				{ id: '12', label: 'Resolved' },
			],
		},
	],
};

function createContext() {
	const context = mockDeep<ILoadOptionsFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ type: 'n8n-nodes-base.hubspot' }));
	context.getNodeParameter.calledWith('authentication', 0).mockReturnValue('oAuth2');
	context.helpers.requestOAuth2.mockImplementation(async (_credentialType, options) => {
		const request = `${options.method} ${String(options.uri)}`;
		switch (request) {
			// NODE-6404: The legacy Pipelines API stops responding after 4 December 2026.
			case 'GET https://api.hubapi.com/crm-pipelines/v1/pipelines/deals':
			case 'GET https://api.hubapi.com/crm-pipelines/v1/pipelines/tickets':
				throw Object.assign(new Error(`410 Gone: ${request}`), { statusCode: 410 });
			case 'GET https://api.hubapi.com/crm/v3/pipelines/deals':
				return dealPipelines;
			case 'GET https://api.hubapi.com/crm/v3/pipelines/tickets':
				return ticketPipelines;
			default:
				throw new Error(`Unexpected request: ${request}`);
		}
	});
	return context;
}

const hubspotV1 = new HubspotV1(baseDescription);
const hubspotV2 = new HubspotV2(baseDescription);

describe.each([
	['V1', hubspotV1.methods.loadOptions],
	['V2', hubspotV2.methods.loadOptions],
])('HubSpot %s pipeline loadOptions after the legacy API retirement', (_version, loadOptions) => {
	it('loads every deal stage with its pipeline label and CRM v3 ID', async () => {
		const context = createContext();

		await expect(loadOptions.getDealStages.call(context)).resolves.toEqual([
			{ name: 'Sales > Appointment Scheduled', value: 'appointmentscheduled' },
			{ name: 'Sales > Closed Won', value: 'closedwon' },
			{ name: 'Renewals > Renewal Review', value: 'renewalreview' },
			{ name: 'Renewals > Closed Won', value: 'renewalclosedwon' },
		]);
	});

	it('returns no deal stages when there are no pipelines', async () => {
		const context = createContext();
		context.helpers.requestOAuth2.mockResolvedValue({ results: [] });

		await expect(loadOptions.getDealStages.call(context)).resolves.toEqual([]);
	});

	it('loads ticket pipelines with CRM v3 pipeline IDs', async () => {
		const context = createContext();

		await expect(loadOptions.getTicketPipelines.call(context)).resolves.toEqual([
			{ name: 'Support', value: '0' },
			{ name: 'Escalations', value: '10' },
		]);
	});

	it('loads only the selected ticket pipeline stages with CRM v3 stage IDs', async () => {
		const context = createContext();
		context.getCurrentNodeParameter.calledWith('pipelineId').mockReturnValue('10');

		await expect(loadOptions.getTicketStages.call(context)).resolves.toEqual([
			{ name: 'Engineering Review', value: '11' },
			{ name: 'Resolved', value: '12' },
		]);
	});

	it('loads ticket stages from the pipeline selected in update fields', async () => {
		const context = createContext();
		const pipelines = await loadOptions.getTicketPipelines.call(context);
		context.getCurrentNodeParameter.calledWith('pipelineId').mockReturnValue(undefined);
		context.getNodeParameter
			.calledWith('updateFields.pipelineId', '')
			.mockReturnValue(pipelines[1].value);

		await expect(loadOptions.getTicketStages.call(context)).resolves.toEqual([
			{ name: 'Engineering Review', value: '11' },
			{ name: 'Resolved', value: '12' },
		]);
	});
});

describe('HubSpot V2 deal pipeline loadOptions', () => {
	it('loads deal pipelines from CRM v3 after the legacy API retirement', async () => {
		const context = createContext();

		await expect(hubspotV2.methods.loadOptions.getDealPipelines.call(context)).resolves.toEqual([
			{ name: 'Sales', value: 'default' },
			{ name: 'Renewals', value: 'renewals' },
		]);
	});
});

describe.each([
	['V1', hubspotV1],
	['V2', hubspotV2],
])('HubSpot %s execution with saved pipeline parameters', (_version, node) => {
	it.each(['create', 'update'])('uses the saved deal stage ID for %s', async (operation) => {
		const context = createExecuteContext('deal', operation);
		context.getNodeParameter.calledWith('stage', 0).mockReturnValue('appointmentscheduled');
		context.getNodeParameter
			.calledWith('updateFields', 0)
			.mockReturnValue({ stage: 'appointmentscheduled' });
		context.getNodeParameter.calledWith('dealId', 0).mockReturnValue('123');
		context.getNodeParameter
			.calledWith('dealId', 0, {}, { extractValue: true })
			.mockReturnValue('123');

		await expect(node.execute.call(context)).resolves.toEqual([
			[{ json: { id: '123' }, pairedItem: { item: 0 } }],
		]);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledOnce();
		const [, request] = context.helpers.requestOAuth2.mock.calls[0];
		expect(request.method).toBe(operation === 'create' ? 'POST' : 'PUT');
		expect(String(request.uri)).toBe(
			operation === 'create'
				? 'https://api.hubapi.com/deals/v1/deal'
				: 'https://api.hubapi.com/deals/v1/deal/123',
		);
		expect(request.body).toMatchObject({
			// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
			properties: [{ name: 'dealstage', value: 'appointmentscheduled' }],
		});
	});

	it.each(['create', 'update'])(
		'uses the saved ticket pipeline and stage IDs for %s',
		async (operation) => {
			const context = createExecuteContext('ticket', operation);
			context.getNodeParameter.calledWith('pipelineId', 0).mockReturnValue('0');
			context.getNodeParameter.calledWith('stageId', 0).mockReturnValue('1');
			context.getNodeParameter.calledWith('ticketName', 0).mockReturnValue('Support request');
			context.getNodeParameter.calledWith('ticketId', 0).mockReturnValue('123');
			context.getNodeParameter
				.calledWith('ticketId', 0, undefined, { extractValue: true })
				.mockReturnValue('123');
			context.getNodeParameter
				.calledWith('updateFields', 0)
				.mockReturnValue({ pipelineId: '0', stageId: '1' });

			await expect(node.execute.call(context)).resolves.toEqual([
				[{ json: { id: '123' }, pairedItem: { item: 0 } }],
			]);

			expect(context.helpers.requestOAuth2).toHaveBeenCalledOnce();
			const [, request] = context.helpers.requestOAuth2.mock.calls[0];
			expect(request.method).toBe(operation === 'create' ? 'POST' : 'PUT');
			expect(String(request.uri)).toBe(
				operation === 'create'
					? 'https://api.hubapi.com/crm-objects/v1/objects/tickets'
					: 'https://api.hubapi.com/crm-objects/v1/objects/tickets/123',
			);
			expect(request.body).toEqual(
				expect.arrayContaining([
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					{ name: 'hs_pipeline', value: '0' },
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					{ name: 'hs_pipeline_stage', value: '1' },
				]),
			);
		},
	);
});

function createExecuteContext(resource: string, operation: string) {
	const context = mockDeep<IExecuteFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ type: 'n8n-nodes-base.hubspot' }));
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNodeParameter.calledWith('authentication', 0).mockReturnValue('oAuth2');
	context.getNodeParameter.calledWith('resource', 0).mockReturnValue(resource);
	context.getNodeParameter.calledWith('operation', 0).mockReturnValue(operation);
	context.getNodeParameter.calledWith('additionalFields', 0).mockReturnValue({});
	context.helpers.requestOAuth2.mockResolvedValue({ id: '123' });
	context.helpers.returnJsonArray.mockReturnValue([{ json: { id: '123' } }]);
	context.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) =>
		data.map((item) => ({ ...item, pairedItem: itemData })),
	);
	return context;
}
