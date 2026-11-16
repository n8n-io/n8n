import { mock, mockDeep } from 'vitest-mock-extended';
import type { ILoadOptionsFunctions, INode, INodeTypeBaseDescription } from 'n8n-workflow';

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
			stages: [{ id: 'appointmentscheduled', label: 'Appointment Scheduled' }],
		},
		{
			id: 'renewals',
			label: 'Renewals',
			stages: [{ id: 'renewalreview', label: 'Renewal Review' }],
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
	it('loads deal stages from every pipeline with CRM v3 stage IDs', async () => {
		const context = createContext();

		await expect(loadOptions.getDealStages.call(context)).resolves.toEqual([
			{ name: 'Appointment Scheduled', value: 'appointmentscheduled' },
			{ name: 'Renewal Review', value: 'renewalreview' },
		]);
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
