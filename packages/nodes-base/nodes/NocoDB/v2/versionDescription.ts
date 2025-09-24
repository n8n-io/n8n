/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as base from './actions/base/base.resource';
import * as linkrows from './actions/linkrows/linkrows.resource';
import * as rows from './actions/rows/rows.resource';

export const authentication: INodeProperties = {
	displayName: 'Authentication',
	name: 'authentication',
	type: 'options',
	options: [
		{
			name: 'API Token',
			value: 'nocoDbApiToken',
		},
		{
			name: 'User Token',
			value: 'nocoDb',
		},
	],
	default: 'nocoDb',
};

export const versionDescription: INodeTypeDescription = {
	displayName: 'NocoDB',
	name: 'nocoDb',
	icon: 'file:nocodb.svg',
	group: ['input'],
	defaultVersion: 4,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Read, update, write and delete data from NocoDB',
	usableAsTool: true,
	defaults: {
		name: 'NocoDB',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	version: [4],
	credentials: [
		{
			name: 'nocoDb',
			required: true,
			displayOptions: {
				show: {
					authentication: ['nocoDb'],
				},
			},
		},
		{
			name: 'nocoDbApiToken',
			required: true,
			displayOptions: {
				show: {
					authentication: ['nocoDbApiToken'],
				},
			},
		},
	],
	properties: [
		authentication,

		{
			displayName: 'API Version Name or ID',
			name: 'version',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			isNodeSetting: true,
			typeOptions: {
				loadOptionsDependsOn: ['resource', 'operation'],
				loadOptionsMethod: 'getApiVersions',
			},

			default: 4,
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Row',
					value: 'row',
				},
				{
					name: 'Linked Row',
					value: 'linkrow',
				},
				{
					name: 'Base',
					value: 'base',
				},
			],
			default: 'row',
		},
		...rows.description,
		...base.description,
		...linkrows.description,
	],
};
