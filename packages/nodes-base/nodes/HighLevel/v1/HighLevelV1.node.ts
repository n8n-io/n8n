import type {
	INodeProperties,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { contactFields, contactNotes, contactOperations } from './description/ContactDescription';
import { opportunityFields, opportunityOperations } from './description/OpportunityDescription';
import { taskFields, taskOperations } from './description/TaskDescription';
import {
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
	version: 1,
	description: 'Consume HighLevel API v1',
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	defaults: {
		name: 'HighLevel',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'highLevelApi',
			required: true,
		},
	],
	requestDefaults: {
		baseURL: 'https://rest.gohighlevel.com/v1',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
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

export class HighLevelV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		loadOptions: {
			getPipelineStages,
			getUsers,
			getTimezones,
		},
	};
}
