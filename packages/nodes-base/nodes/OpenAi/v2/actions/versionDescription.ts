/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as operations from './operations';
import { prettifyOperation } from '../helpers/utils';

// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
export const versionDescription: INodeTypeDescription = {
	displayName: 'OpenAI',
	name: 'openAi',
	icon: 'file:openAi.svg',
	group: ['transform'],
	version: 2,
	subtitle: `={{(${prettifyOperation})($parameter.operation)}}`,
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
					description: 'Upload a file that can be used across various endpoints',
				},
				{
					name: 'List Files',
					value: 'listFiles',
					action: 'List files',
					description: "Returns a list of files that belong to the user's organization",
				},
				{
					name: 'Delete a File',
					value: 'deleteFile',
					action: 'Delete a file',
					description: 'Delete a file from the server',
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
					description: 'Transcribes audio into the text',
				},
				{
					name: 'Translate a Recording',
					value: 'translateRecording',
					action: 'Translate a recording',
					description: 'Translate audio into the text in the english language',
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
