/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as audio from './audio';
import * as file from './file';
import * as image from './image';
import * as text from './text';

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
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Text',
					value: 'text',
				},
				{
					name: 'Audio',
					value: 'audio',
				},
				{
					name: 'Image',
					value: 'image',
				},
				{
					name: 'File',
					value: 'file',
				},
			],
			default: 'text',
		},
		...audio.description,
		...file.description,
		...image.description,
		...text.description,
	],
};
