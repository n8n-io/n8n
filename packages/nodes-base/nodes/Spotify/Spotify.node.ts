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
							'accessToken',
						],
					},
				},
			},
			{
				name: 'spotifyOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
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
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
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
				default: 'player',
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
						value: 'albums',
						description: 'Get an Album By ID',
					},
					{
						name: `Get an Album's Tracks`,
						value: 'tracks',
						description: `Get an Album's Tracks By ID`,
					},
				],
				default: 'albums',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Album ID',
				name: 'albumID',
				type: 'string',
				default: '62XZju4HxxXF6CBIqqG2ei',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'albums',
						],
					},
				},
				placeholder: '62XZju4HxxXF6CBIqqG2ei',
				description: 'The end of an albums Spotify URI',
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
						value: 'artist',
						description: 'Get an Artist By ID',
					},
					{
						name: `Get an Artist's Related Artists`,
						value: 'related-artists',
						description: `Get an Artist's Related Artists by ID`,
					},
					{
						name: `Get an Artist's Top Tracks`,
						value: 'top-tracks',
						description: `Get an Artist's Top Tracks by ID`,
					},
					{
						name: `	Get an Artist's Albums by ID`,
						value: 'albums',
						description: `Get an Artist's Albums by ID`,
					},
				],
				default: 'artist',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Artist ID',
				name: 'artistID',
				type: 'string',
				default: '69tiO1fG8VWduDl3ji2qhI',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'artists',
						],
					},
				},
				placeholder: '69tiO1fG8VWduDl3ji2qhI',
				description: `The end of an artist's Spotify URI`,
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: 'US',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'top-tracks',
						],
					},
				},
				placeholder: 'US',
				description: `Top Tracks in Which Country?`,
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
						value: 'get',
						description: 'Get a Playlist By ID',
					},
					{
						name: 'Remove an Item from a Playlist',
						value: 'delete',
						description: 'Remove Tracks from a Playlist By Track and Playlist ID',
					},
					{
						name: 'Add an Item To a Playlist',
						value: 'add',
						description: 'Add Tracks from a Playlist By Track and Playlist ID',
					},
					{
						name: `Get the User's Playlists`,
						value: 'user-playlists',
						description: `Get a User's Playlist`,
					},
				],
				default: 'playlists',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Playlist ID',
				name: 'playlistID',
				type: 'string',
				default: '3w2I1EAz5YLJrQe0CBauxk',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'add',
							'delete', 
							'get'
						],
					},
				},
				placeholder: '3w2I1EAz5YLJrQe0CBauxk',
				description: `The end of an playlist's Spotify URI`,
			},
			{
				displayName: 'Track ID',
				name: 'trackID',
				type: 'string',
				default: '0a4rkBrO9C3BOPWullYPIM',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'add',
							'delete'
						],
					},
				},
				placeholder: '0a4rkBrO9C3BOPWullYPIM',
				description: `The end of an track's Spotify URI. The track to add/delete from the playlist.`,
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
						name: '	Get a Track',
						value: 'tracks', 
						description: 'Get a Track By ID',
					},
					{
						name: '	Get Audio Features for a Track',
						value: 'audio-features', 
						description: 'Get Audio Features for a Track By ID',
					},
					{
						name: 'Get Audio Analysis for a Track',
						value: 'audio-analysis', 
						description: 'Get Audio Analysis for a Track By ID',
					},
				],
				default: 'tracks',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Track ID',
				name: 'trackID',
				type: 'string',
				default: '0a4rkBrO9C3BOPWullYPIM',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'tracks',
						],
					},
				},
				placeholder: '0a4rkBrO9C3BOPWullYPIM',
				description: `The end of an track's Spotify URI`,
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const fullOperation = `${resource}/${operation}`;

		// Set initial values
		requestMethod = 'GET';
		endpoint = '';
		body = {};
		qs = {};

		if( resource === 'player' ) {
			if(['pause'].includes(operation)) {
				requestMethod = 'PUT';

				endpoint = `/me/${fullOperation}`;
			} else if(['recently-played', 'currently-playing'].includes(operation)) {
				requestMethod = 'GET';

				endpoint = `/me/${fullOperation}`;
			} else if(['next', 'previous'].includes(operation)) {
				requestMethod = 'POST';

				endpoint = `/me/${fullOperation}`;
			}
		} else if( resource == 'albums') {
			const id = this.getNodeParameter('albumID', 0) as string;

			requestMethod = 'GET';

			if(['albums'].includes(operation)) {
				endpoint = `$/{resource}/${id}`
			} else if(['tracks'].includes(operation)) {
				endpoint = `/${resource}/${id}/${operation}`
			}
		} else if( resource == 'artists') {
			const id = this.getNodeParameter('artistID', 0) as string;
			requestMethod = 'GET';

			if(['albums','related-artists'].includes(operation)) { //top-tracks requires a country param
				endpoint = `/${resource}/${id}/${operation}`
			} else if(['top-tracks'].includes(operation)){
				const country = this.getNodeParameter('country', 0) as string;

				endpoint = `/${resource}/${id}/top-tracks?country=${country}`
			} else if(['artist'].includes(operation)) {
				endpoint = `/${resource}/${id}`
			}
		} else if( resource == 'playlists') {
			if(['delete'].includes(operation)) {
				requestMethod = 'DELETE';

				const id = this.getNodeParameter('playlistID', 0) as string;
				const trackId = this.getNodeParameter('trackID', 0) as string;

				body.tracks = [
					{
					  "uri": `spotify:track:${trackId}`,
					  "positions": [
						0
					  ]
					}
				]

				endpoint = `/${resource}/${id}/tracks`;
			} else if(['user-playlists'].includes(operation)) {
				requestMethod = 'GET';

				endpoint = `/me/${resource}`;
			} else if(['get'].includes(operation)) {
				requestMethod = 'GET';

				const id = this.getNodeParameter('playlistID', 0) as string;

				endpoint = `/${resource}/${id}`;
			} else if(['add'].includes(operation)) {
				requestMethod = 'POST';

				const id = this.getNodeParameter('playlistID', 0) as string;
				const trackId = this.getNodeParameter('trackID', 0) as string;

				endpoint = `/${resource}/${id}/tracks?uris=spotify:track:${trackId}`;
			}
		} else if( resource == 'tracks') {
			const id = this.getNodeParameter('trackID', 0) as string;
			requestMethod = 'GET';

			if(['audio-features', 'audio-analysis'].includes(operation)) {
				endpoint = `/${operation}/${id}`
			} else if(['tracks'].includes(operation)) {
				endpoint = `/${resource}/${id}`
			}
		}

		const responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

		if( responseData === undefined ) {
			return [this.helpers.returnJsonArray({ status: 'Success!' })];
		}

		return [this.helpers.returnJsonArray(responseData)];
	}
}