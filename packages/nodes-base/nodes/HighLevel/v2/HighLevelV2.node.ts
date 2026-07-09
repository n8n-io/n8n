import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeProperties,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { calendarFields, calendarOperations } from './description/CalendarDescription';
import { contactFields, contactNotes, contactOperations } from './description/ContactDescription';
import { opportunityFields, opportunityOperations } from './description/OpportunityDescription';
import { taskFields, taskOperations } from './description/TaskDescription';
import {
	getContacts,
	getPipelines,
	getPipelineStages,
	getUsers,
	highLevelApiPagination,
} from './GenericFunctions';

const resources: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'Opportunity',
				value: 'opportunity',
			},
			{
				name: 'Task',
				value: 'task',
			},
			{
				name: 'Calendar',
				value: 'calendar',
			},
		],
		default: 'contact',
		required: true,
	},
];

const versionDescription: INodeTypeDescription = {
	displayName: 'HighLevel',
	name: 'highLevel',
	icon: 'file:highLevel.svg',
	group: ['transform'],
	version: 2,
	description: 'Consume HighLevel API v2',
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	defaults: {
		name: 'HighLevel',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'highLevelOAuth2Api',
			required: true,
		},
	],
	requestDefaults: {
		baseURL: 'https://services.leadconnectorhq.com',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Version: '2021-07-28',
		},
	},
	requestOperations: {
		pagination: highLevelApiPagination,
	},
	properties: [
		...resources,
		...contactOperations,
		...contactNotes,
		...contactFields,
		...opportunityOperations,
		...opportunityFields,
		...taskOperations,
		...taskFields,
		...calendarOperations,
		...calendarFields,
	],
};

export class HighLevelV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			getPipelines,
			getContacts,
			getPipelineStages,
			getUsers,
		},
		listSearch: {
			async searchCustomFields(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const { locationId } =
					((await this.getCredentials('highLevelOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};

				const responseData: IDataObject = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'highLevelOAuth2Api',
					{
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						url: `https://services.leadconnectorhq.com/locations/${locationId}/customFields?model=contact`,
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
							Version: '2021-07-28',
						},
					},
				)) as IDataObject;

				const customFields = responseData.customFields as Array<{ name: string; id: string }>;

				const results: INodeListSearchItems[] = customFields
					.map((a) => ({
						name: a.name,
						value: a.id,
					}))
					.filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results };
			},
			async searchTimezones(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const { locationId } =
					((await this.getCredentials('highLevelOAuth2Api'))?.oauthTokenData as IDataObject) ?? {};

				const responseData: IDataObject = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'highLevelOAuth2Api',
					{
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						url: `https://services.leadconnectorhq.com/locations/${locationId}/timezones`,
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
							Version: '2021-07-28',
						},
					},
				)) as IDataObject;

				const timezones = responseData.timeZones as string[];

				const results: INodeListSearchItems[] = timezones
					.map((zone) => ({
						name: zone.trim(),
						value: zone.trim(),
					}))
					.filter((zone) => !filter || zone.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});

				return { results };
			},
		},
	};
}
