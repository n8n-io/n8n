import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Player',
						value: 'player',
					},
					{
						name: 'Albums',
						value: 'albums',
					},
					{
						name: 'Artists',
						value: 'artists',
					},
					{
						name: 'Playlists',
						value: 'playlists',
					},
					{
						name: 'Tracks',
						value: 'tracks',
					},
				],
				default: 'issue',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'player',
						],
					},
				},
				options: [
					{
						name: 'Pause',
						value: 'pause',
						description: 'Pause Your Music',
					},
					{
						name: 'Recently Played',
						value: 'recently-played',
						description: 'Get Your Recently Played Tracks'
					},
					{
						name: 'Currently Playing',
						value: 'currently-playing',
						description: 'Get Your Currently Playing Track'
					},
					{
						name: 'Next Song',
						value: 'next',
						description: 'Skip To Your Next Track'
					},
					{
						name: 'Previous Song',
						value: 'previous',
						description: 'Skip To Your Previous Song'
					}
				],
				default: 'pause',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'albums',
						],
					},
				},
				options: [
					{
						name: 'Get an Album',
						value: 'albums', //this should be a text input for an album id
						description: 'Get an Album By ID',
					},
				],
				default: 'albums',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'artists',
						],
					},
				},
				options: [
					{
						name: 'Get an Artist',
						value: 'artists', //this should be a text input for an artist id
						description: 'Get an Artist By ID',
					},
				],
				default: 'artists',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'playlists',
						],
					},
				},
				options: [
					{
						name: 'Get a Playlist',
						value: 'playlists', //this should be a text input for an playlist id
						description: 'Get a Playlist By ID',
					},
				],
				default: 'playlists',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'tracks',
						],
					},
				},
				options: [
					{
						name: 'Get a Song',
						value: 'tracks', //this should be a text input for an album id
						description: 'Get a Song By ID',
					},
				],
				default: 'tracks',
				description: 'The operation to perform.',
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// For Post
		//let body: IDataObject;
		// For Query string
		//let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const fullOperation = `${resource}/${operation}`;

		// Set initial values
		requestMethod = 'GET';
		endpoint = '';

		if( resource === 'player' ) {
			if(['pause'].includes(operation)) {
				requestMethod = 'PUT';

				endpoint = fullOperation;
			} else if(['recently-played', 'currently-playing'].includes(operation)) {
				requestMethod = 'GET';

				endpoint = fullOperation;
			} else if(['next', 'previous'].includes(operation)) {
				requestMethod = 'POST';

				endpoint = fullOperation;
			}
		}

		const responseData = await spotifyApiRequest.call(this, requestMethod, endpoint);

		return this.prepareOutputData(responseData);
	}
}
