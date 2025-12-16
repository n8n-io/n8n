/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription, type INodeProperties } from 'n8n-workflow';

import * as drive from './drive/Drive.resource';
import * as file from './file/File.resource';
import * as fileFolder from './fileFolder/FileFolder.resource';
import * as folder from './folder/Folder.resource';

const preBuiltAgentsCallout: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
	displayName:
		'Retrieve, analyze, and answer questions using your Google Drive documents with our pre-built',
	name: 'preBuiltAgentsCalloutGoogleDrive',
	type: 'callout',
	typeOptions: {
		calloutAction: {
			label: 'Knowledge store agent',
			icon: 'bot',
			type: 'openSampleWorkflowTemplate',
			templateId: 'knowledge_store_agent_with_google_drive',
		},
	},
	default: '',
};

export const versionDescription: INodeTypeDescription = {
	displayName: 'Google Drive',
	name: 'googleDrive',
	icon: 'file:googleDrive.svg',
	group: ['input'],
	version: 3,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Access data on Google Drive',
	defaults: {
		name: 'Google Drive',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'googleApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['serviceAccount'],
				},
			},
		},
		{
			name: 'googleDriveOAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
	],
	properties: [
		preBuiltAgentsCallout,
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'OAuth2 (recommended)',
					value: 'oAuth2',
				},
				{
					name: 'Service Account',
					value: 'serviceAccount',
				},
			],
			default: 'oAuth2',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'File',
					value: 'file',
				},
				{
					name: 'File/Folder',
					value: 'fileFolder',
				},
				{
					name: 'Folder',
					value: 'folder',
				},
				{
					name: 'Shared Drive',
					value: 'drive',
				},
			],
			default: 'file',
		},
		...drive.description,
		...file.description,
		...fileFolder.description,
		...folder.description,
	],
};
