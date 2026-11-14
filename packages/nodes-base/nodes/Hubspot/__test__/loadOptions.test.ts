import type { ILoadOptionsFunctions, INodeTypeBaseDescription } from 'n8n-workflow';

import { HubspotV1 } from '../V1/HubspotV1.node';
import { getAllProperties } from '../V2/GenericFunctions';
import { HubspotV2 } from '../V2/HubspotV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'HubSpot',
	name: 'hubspot',
	group: ['output'],
	description: 'Consume HubSpot API',
};

type DealProperty = {
	name: string;
	label: string;
	type?: string;
	hubspotDefined?: boolean;
};

/**
 * Build a fake ILoadOptionsFunctions whose HTTP helper serves the given
 * deal properties as one or two pages of the CRM v3 properties response.
 * `pageBreakAfter` splits the list to simulate cursor pagination.
 */
function createContext(properties: DealProperty[], pageBreakAfter?: number) {
	// `qs` is mutated in place between requests, so snapshot the cursor per call.
	const cursorsSent: Array<string | undefined> = [];
	const urisRequested: string[] = [];
	const requestWithAuthentication = vi.fn(async (_credentialType: string, options: any) => {
		const after = options.qs?.after as string | undefined;
		cursorsSent.push(after);
		urisRequested.push(String(options.uri));
		if (pageBreakAfter === undefined) {
			return { results: properties };
		}
		if (!after) {
			return {
				results: properties.slice(0, pageBreakAfter),
				paging: { next: { after: 'cursor-1' } },
			};
		}
		return { results: properties.slice(pageBreakAfter) };
	});

	const context = {
		getNodeParameter: vi.fn((name: string) => (name === 'authentication' ? 'appToken' : undefined)),
		getNode: vi.fn().mockReturnValue({ type: 'n8n-nodes-base.hubspot' }),
		helpers: { requestWithAuthentication },
	} as unknown as ILoadOptionsFunctions;

	return { context, requestWithAuthentication, cursorsSent, urisRequested };
}

const node = new HubspotV2(baseDescription);
const loadOptions = node.methods!.loadOptions!;

describe('HubSpot V2 deal property loadOptions', () => {
	afterEach(() => vi.clearAllMocks());

	describe('getAllProperties pagination', () => {
		it('follows the paging cursor to collect properties across pages', async () => {
			const properties: DealProperty[] = [
				{ name: 'amount', label: 'Amount' },
				{ name: 'pipeline', label: 'Pipeline' },
				{ name: 'hs_priority', label: 'Priority' },
			];
			const { context, requestWithAuthentication, cursorsSent, urisRequested } = createContext(
				properties,
				2,
			);

			const result = await getAllProperties.call(context, 'deals');

			expect(result).toHaveLength(3);
			expect(requestWithAuthentication).toHaveBeenCalledTimes(2);
			// first page has no cursor, second page passes the cursor from the first page
			expect(cursorsSent).toEqual([undefined, 'cursor-1']);
			expect(urisRequested[1]).toContain('/crm/v3/properties/deals');
		});
	});

	describe('getDealProperties', () => {
		it('returns every property (including ones on later pages) sorted by label', async () => {
			const properties: DealProperty[] = [
				{ name: 'pipeline', label: 'Pipeline' },
				{ name: 'amount', label: 'Amount' },
				{ name: 'hs_priority', label: 'Priority' },
			];
			const { context } = createContext(properties, 2);

			const result = await loadOptions.getDealProperties.call(context);

			expect(result).toEqual([
				{ name: 'Amount', value: 'amount' },
				{ name: 'Pipeline', value: 'pipeline' },
				{ name: 'Priority', value: 'hs_priority' },
			]);
		});
	});

	describe('getDealPropertiesWithType', () => {
		it('encodes the property type into the option value', async () => {
			const properties: DealProperty[] = [
				{ name: 'amount', label: 'Amount', type: 'number' },
				{ name: 'closedate', label: 'Close Date', type: 'datetime' },
			];
			const { context } = createContext(properties);

			const result = await loadOptions.getDealPropertiesWithType.call(context);

			expect(result).toEqual([
				{ name: 'Amount', value: 'amount|number' },
				{ name: 'Close Date', value: 'closedate|datetime' },
			]);
		});
	});
});

type Pipeline = {
	id: string;
	label: string;
	stages: Array<{ id: string; label: string }>;
};

/**
 * Build a fake ILoadOptionsFunctions whose HTTP helper serves the given
 * pipelines as a CRM v3 pipelines response. `currentPipelineId` is what the
 * UI reports as the selected `pipelineId` parameter.
 */
function createPipelineContext(pipelines: Pipeline[], currentPipelineId?: string) {
	const urisRequested: string[] = [];
	const record = async (options: any) => {
		urisRequested.push(String(options.uri));
		return { results: pipelines };
	};
	// V2 authenticates through requestWithAuthentication, V1 through getCredentials + request
	const requestWithAuthentication = vi.fn(
		async (_credentialType: string, options: any) => await record(options),
	);
	const request = vi.fn(async (options: any) => await record(options));

	const context = {
		getNodeParameter: vi.fn((name: string, _index?: number, fallback?: unknown) =>
			name === 'authentication' ? 'appToken' : fallback,
		),
		getCurrentNodeParameter: vi.fn().mockReturnValue(currentPipelineId),
		getCredentials: vi.fn().mockResolvedValue({ appToken: 'test-token' }),
		getNode: vi.fn().mockReturnValue({ type: 'n8n-nodes-base.hubspot' }),
		helpers: { requestWithAuthentication, request },
	} as unknown as ILoadOptionsFunctions;

	return { context, urisRequested };
}

const dealPipelines: Pipeline[] = [
	{
		id: 'default',
		label: 'Sales Pipeline',
		stages: [
			{ id: 'appointmentscheduled', label: 'Appointment Scheduled' },
			{ id: 'closedwon', label: 'Closed Won' },
		],
	},
];

const ticketPipelines: Pipeline[] = [
	{
		id: '0',
		label: 'Support Pipeline',
		stages: [
			{ id: '1', label: 'New' },
			{ id: '2', label: 'Waiting on us' },
		],
	},
	{
		id: '12345',
		label: 'Billing Pipeline',
		stages: [
			{ id: '3', label: 'Open' },
			{ id: '4', label: 'Closed' },
		],
	},
];

describe.each([
	['V2', new HubspotV2(baseDescription).methods!.loadOptions!],
	['V1', new HubspotV1(baseDescription).methods!.loadOptions!],
])('HubSpot %s pipeline loadOptions', (_version, methods) => {
	afterEach(() => vi.clearAllMocks());

	describe('getDealStages', () => {
		it('reads the stages from the CRM v3 deals pipelines endpoint', async () => {
			const { context, urisRequested } = createPipelineContext(dealPipelines);

			const result = await methods.getDealStages.call(context);

			expect(urisRequested).toEqual(['https://api.hubapi.com/crm/v3/pipelines/deals']);
			expect(result).toEqual([
				{ name: 'Appointment Scheduled', value: 'appointmentscheduled' },
				{ name: 'Closed Won', value: 'closedwon' },
			]);
		});
	});

	describe('getTicketPipelines', () => {
		it('reads the pipelines from the CRM v3 tickets pipelines endpoint', async () => {
			const { context, urisRequested } = createPipelineContext(ticketPipelines);

			const result = await methods.getTicketPipelines.call(context);

			expect(urisRequested).toEqual(['https://api.hubapi.com/crm/v3/pipelines/tickets']);
			expect(result).toEqual([
				{ name: 'Support Pipeline', value: '0' },
				{ name: 'Billing Pipeline', value: '12345' },
			]);
		});
	});

	describe('getTicketStages', () => {
		it('returns only the stages of the pipeline matching the pipelineId parameter', async () => {
			const { context, urisRequested } = createPipelineContext(ticketPipelines, '12345');

			const result = await methods.getTicketStages.call(context);

			expect(urisRequested).toEqual(['https://api.hubapi.com/crm/v3/pipelines/tickets']);
			expect(result).toEqual([
				{ name: 'Open', value: '3' },
				{ name: 'Closed', value: '4' },
			]);
		});

		it('returns no stages when no pipeline matches the pipelineId parameter', async () => {
			const { context } = createPipelineContext(ticketPipelines, 'unknown');

			const result = await methods.getTicketStages.call(context);

			expect(result).toEqual([]);
		});
	});
});
