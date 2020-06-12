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
				default: 'oAuth2',
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
					},
					{
						name: 'Add Song to Queue',
						value: 'queue',
						description: 'Skip To Your Previous Song'
					},
					{
						name: 'Start Music',
						value: 'play',
						description: 'Start Playing a Playlist, Artist, or Album'
					}
				],
				default: 'pause',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Resource URI',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'play',
						],
					},
				},
				placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
				description: `Enter a Playlist, Artist, or Album URI`,
			},
			{
				displayName: 'Track URI',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'queue',
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `Enter a Track URI`,
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
				displayName: 'Album URI',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'albums',
						],
					},
				},
				placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
				description: `The Album's Spotify URI`,
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
						name: `Get an Artist's Albums by ID`,
						value: 'albums',
						description: `Get an Artist's Albums by ID`,
					},
				],
				default: 'artist',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Artist URI',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'artists',
						],
					},
				},
				placeholder: 'spotify:artist:4LLpKhyESsyAXpc4laK94U',
				description: `The Artist's Spotify URI`,
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
				displayName: 'Playlist URI',
				name: 'id',
				type: 'string',
				default: '',
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
				placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
				description: `The Playlist's Spotify URI`,
			},
			{
				displayName: 'Track URI',
				name: 'trackID',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'add',
							'delete'
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `The Track's Spotify URI. The track to add/delete from the playlist.`,
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
						name: 'Get a Track',
						value: 'tracks',
						description: 'Get a Track By ID',
					},
					{
						name: 'Get Audio Features for a Track',
						value: 'audio-features',
						description: 'Get Audio Features for a Track By ID',
					},
				],
				default: 'tracks',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Track URI',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'tracks',
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `The Track's Spotify URI`,
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

		// Set initial values
		requestMethod = 'GET';
		endpoint = '';
		body = {};
		qs = {};

		if( resource === 'player' ) {
			endpoint = `/me/${resource}/${operation}`;

			if(['pause'].includes(operation)) {
				requestMethod = 'PUT';
			} else if(['recently-played', 'currently-playing'].includes(operation)) {
				requestMethod = 'GET';
			} else if(['next', 'previous'].includes(operation)) {
				requestMethod = 'POST';
			} else if(['play'].includes(operation)) {
				requestMethod = 'PUT';

				const id = this.getNodeParameter('id', 0) as string;

				body.context_uri = `${id}`;
			} else if(['queue'].includes(operation)) {
				requestMethod = 'POST';

				const id = this.getNodeParameter('id', 0) as string;

				endpoint = endpoint + `?uri=${id}`;
			}
		} else if( resource === 'albums') {
			const uri = this.getNodeParameter('id', 0) as string;

			const id = uri.replace('spotify:album:', '');

			requestMethod = 'GET';

			if(['albums'].includes(operation)) {
				endpoint = `/${resource}/${id}`;
			} else if(['tracks'].includes(operation)) {
				endpoint = `/${resource}/${id}/${operation}`;
			}
		} else if( resource === 'artists') {
			const uri = this.getNodeParameter('id', 0) as string;

			const id = uri.replace('spotify:artist:', '');

			requestMethod = 'GET';

			endpoint = `/${resource}/${id}`;

			if(['albums','related-artists'].includes(operation)) {
				endpoint = endpoint + `/${operation}`;
			} else if(['top-tracks'].includes(operation)){
				const country = this.getNodeParameter('country', 0) as string;

				endpoint = endpoint + `/top-tracks?country=${country}`;
			}
		} else if( resource === 'playlists') {
			if(['delete'].includes(operation)) {
				requestMethod = 'DELETE';

				const uri = this.getNodeParameter('id', 0) as string;

				const id = uri.replace('spotify:playlist:', '');

				const trackId = this.getNodeParameter('trackID', 0) as string;

				body.tracks = [
					{
					  "uri": `${trackId}`,
					  "positions": [
						0
					  ]
					}
				];

				endpoint = `/${resource}/${id}/tracks`;
			} else if(['user-playlists'].includes(operation)) {
				requestMethod = 'GET';

				endpoint = `/me/${resource}`;
			} else if(['get'].includes(operation)) {
				requestMethod = 'GET';

				const uri = this.getNodeParameter('id', 0) as string;

				const id = uri.replace('spotify:playlist:', '');

				endpoint = `/${resource}/${id}`;
			} else if(['add'].includes(operation)) {
				requestMethod = 'POST';

				const uri = this.getNodeParameter('id', 0) as string;

				const id = uri.replace('spotify:playlist:', '');

				const trackId = this.getNodeParameter('trackID', 0) as string;

				endpoint = `/${resource}/${id}/tracks?uris=${trackId}`;
			}
		} else if( resource === 'tracks') {
			const uri = this.getNodeParameter('id', 0) as string;

			const id = uri.replace('spotify:track:', '');

			requestMethod = 'GET';

			if(['audio-features'].includes(operation)) {
				endpoint = `/${operation}/${id}`;
			} else if(['tracks'].includes(operation)) {
				endpoint = `/${resource}/${id}`;
			}
		}

		const responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

		if( responseData === undefined ) {
			return [this.helpers.returnJsonArray({ status: 'Success!' })];
		}

		return [this.helpers.returnJsonArray(responseData)];
	}
}
