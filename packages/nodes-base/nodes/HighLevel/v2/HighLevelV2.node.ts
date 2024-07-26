/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	INodeProperties,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { contactFields, contactNotes, contactOperations } from './description/ContactDescription';
import { opportunityFields, opportunityOperations } from './description/OpportunityDescription';
import { taskFields, taskOperations } from './description/TaskDescription';
import {
	getContacts,
	getPipelines,
	getPipelineStages,
	getTimezones,
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
	inputs: ['main'],
	outputs: ['main'],
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
			getTimezones,
		},
	};
}
