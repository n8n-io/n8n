/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as operations from './operations';

export const versionDescription: INodeTypeDescription = {
	displayName: 'OpenAI',
	name: 'openAi',
	icon: 'file:openAi.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter.operation}}',
	description: 'Consume Open AI',
	defaults: {
		name: 'OpenAI',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'openAiApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Message a Model',
					value: 'messageModel',
					action: 'Message a model',
				},
				{
					name: 'Message an Assistant',
					value: 'messageAssistant',
					action: 'Message an assistant',
				},
				{
					name: 'Upload a File',
					value: 'uploadFile',
					action: 'Upload a file',
				},
				{
					name: 'List Files',
					value: 'listFiles',
					action: 'List files',
				},
				{
					name: 'Delete a File',
					value: 'deleteFile',
					action: 'Delete a file',
				},
				{
					name: 'Generate an Image',
					value: 'generateImage',
					action: 'Generate an image',
					description: 'Creates an image from a text prompt',
				},
				{
					name: 'Generate Audio',
					value: 'generateAudio',
					action: 'Generate audio',
					description: 'Creates audio from a text prompt',
				},
				{
					name: 'Transcribe a Recording',
					value: 'transcribeRecording',
					action: 'Transcribe a recording',
				},
				{
					name: 'Analyze Image',
					value: 'analyzeImage',
					action: 'Analyze image',
					description: 'Take in images and answer questions about them',
				},
				{
					name: 'Classify Text for Violations',
					value: 'createModeration',
					action: 'Classify text for violations',
					description: 'Check whether content complies with usage policies',
				},
			],
			default: 'messageModel',
		},
		...operations.description,
	],
};
