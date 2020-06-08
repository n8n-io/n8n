import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	spotifyApiRequest,
} from './GenericFunctions';


export class Spotify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spotify',
		name: 'spotify',
		icon: 'file:spotify.png',
		group: ['input'],
		version: 1,
		description: 'Access public song data via the Spotify API.',
		defaults: {
			name: 'Spotify',
			color: '#1DB954',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'spotifyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuthToken',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'oAuth Token',
						value: 'oAuthToken',
					},
				],
				default: 'oAuthToken',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Pause',
						value: 'pause',
						description: 'Pause Your Music',
					},
				],
				default: 'pause',
				description: 'The operation to perform.',
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let requestMethod = 'PUT';

		let endpoint = `/player/pause`;

		const responseData = await spotifyApiRequest.call(this, requestMethod, endpoint);

		return this.prepareOutputData(responseData);
	}
}
