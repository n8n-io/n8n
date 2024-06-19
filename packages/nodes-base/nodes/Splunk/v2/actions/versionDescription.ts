/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as fieldAlert from './firedAlert';
import * as searchConfiguration from './searchConfiguration';
import * as searchJob from './searchJob';
import * as searchResult from './searchResult';
import * as user from './user';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Splunk',
	name: 'splunk',
	icon: 'file:splunk.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Splunk Enterprise API',
	defaults: {
		name: 'Splunk',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'splunkApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Fired Alert',
					value: 'firedAlert',
				},
				{
					name: 'Search Configuration',
					value: 'searchConfiguration',
				},
				{
					name: 'Search Job',
					value: 'searchJob',
				},
				{
					name: 'Search Result',
					value: 'searchResult',
				},
				{
					name: 'User',
					value: 'user',
				},
			],
			default: 'searchJob',
		},

		...fieldAlert.description,
		...searchConfiguration.description,
		...searchJob.description,
		...searchResult.description,
		...user.description,
	],
};
