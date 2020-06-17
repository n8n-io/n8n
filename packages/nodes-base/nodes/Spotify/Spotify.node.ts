import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	spotifyApiRequest,
	spotifyApiRequestAllItems,
} from './GenericFunctions';


export class Spotify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spotify',
		name: 'spotify',
		icon: 'file:spotify.png',
		group: ['input'],
		version: 1,
		description: 'Access public song data via the Spotify API.',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
			// ----------------------------------
			//         Authentication
			// ----------------------------------
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
			// ----------------------------------------------------------
			//         Resource to Operate on
			//		   Player, Album, Artisits, Playlists, Tracks
			// ----------------------------------------------------------
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
			// --------------------------------------------------------------------------------------------------------
			//         Player Operations
			//		   Pause, Play, Get Recently Played, Get Currently Playing, Next Song, Previous Song, Add to Queue
			// --------------------------------------------------------------------------------------------------------
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
						description: 'Pause your music.',
					},
					{
						name: 'Start Music',
						value: 'play',
						description: 'Start playing a playlist, artist, or album.'
					},
					{
						name: 'Recently Played',
						value: 'recently-played',
						description: 'Get your recently played tracks.'
					},
					{
						name: 'Currently Playing',
						value: 'currently-playing',
						description: 'Get your currently playing track.'
					},
					{
						name: 'Next Song',
						value: 'next',
						description: 'Skip to your next track.'
					},
					{
						name: 'Previous Song',
						value: 'previous',
						description: 'Skip to your previous song.'
					},
					{
						name: 'Add Song to Queue',
						value: 'queue',
						description: 'Add a song to your queue.'
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
						resource: [
							'player'
						],
						operation: [
							'play',
						],
					},
				},
				placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
				description: `Enter a playlist, artist, or album URI.`,
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
							'player'
						],
						operation: [
							'queue',
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `Enter a track URI.`,
			},
			// -----------------------------------------------
			//         Album Operations
			//		   Get an Album, Get an Album's Tracks
			// -----------------------------------------------
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
						name: 'Get',
						value: 'album',
						description: 'Get an album by URI.',
					},
					{
						name: `Get Tracks`,
						value: 'tracks',
						description: `Get an album's tracks by URI.`,
					},
				],
				default: 'album',
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
				description: `The album's Spotify URI.`,
			},
			// -------------------------------------------------------------------------------------------------------------
			//         Artist Operations
			//		   Get an Artist, Get an Artist's Related Artists, Get an Artist's Top Tracks, Get an Artist's Albums
			// -------------------------------------------------------------------------------------------------------------
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
						name: 'Get',
						value: 'artist',
						description: 'Get an artist by URI.',
					},
					{
						name: `Get Related Artists`,
						value: 'related-artists',
						description: `Get an artist's related artists by URI.`,
					},
					{
						name: `Get Top Tracks`,
						value: 'top-tracks',
						description: `Get an artist's top tracks by URI.`,
					},
					{
						name: `Get Albums`,
						value: 'albums',
						description: `Get an artist's albums by URI.`,
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
				description: `The artist's Spotify URI.`,
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: 'US',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'artists'
						],
						operation: [
							'top-tracks',
						],
					},
				},
				placeholder: 'US',
				description: `Top tracks in which country? Enter the postal abbriviation.`,
			},
			// -------------------------------------------------------------------------------------------------------------
			//         Playlist Operations
			//		   Get a Playlist, Get a Playlist's Tracks, Add/Remove a Song from a Playlist, Get a User's Playlists
			// -------------------------------------------------------------------------------------------------------------
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
						name: 'Get',
						value: 'get',
						description: 'Get a playlist by URI.',
					},
					{
						name: `Get Tracks`,
						value: 'tracks',
						description: `Get a playlist's tracks by URI.`,
					},
					{
						name: 'Remove an Item',
						value: 'delete',
						description: 'Remove tracks from a playlist by track and playlist URI.',
					},
					{
						name: 'Add an Item',
						value: 'add',
						description: 'Add tracks from a playlist by track and playlist URI.',
					},
					{
						name: `Get the User's Playlists`,
						value: 'user-playlists',
						description: `Get a user's playlists.`,
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
						resource: [
							'playlists'
						],
						operation: [
							'add',
							'delete',
							'get',
							'tracks'
						],
					},
				},
				placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
				description: `The playlist's Spotify URI.`,
			},
			{
				displayName: 'Track URI',
				name: 'trackID',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'playlists'
						],
						operation: [
							'add',
							'delete'
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `The track's Spotify URI. The track to add/delete from the playlist.`,
			},
			// -----------------------------------------------------
			//         Track Operations
			//		   Get a Track, Get a Track's Audio Features
			// -----------------------------------------------------
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
						name: 'Get',
						value: 'tracks',
						description: 'Get a track by its URI.',
					},
					{
						name: 'Get Audio Features',
						value: 'audio-features',
						description: 'Get audio features for a track by URI.',
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
				description: `The track's Spotify URI.`,
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 30,
				required: true,
				displayOptions: {
					show: {
						resource: [
							'player',
							'albums',
							'artists',
							'playlists'
						],
						operation: [
							'recently-played',
							'tracks',
							'albums',
							'user-playlists'
						]
					},
				},
				description: `The number of items to return.`,
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						resource: [
							'player',
							'albums',
							'artists',
							'playlists'
						],
						operation: [
							'recently-played',
							'tracks',
							'albums',
							'user-playlists'
						]
					},
				},
				description: `The number of items to return.`,
			},
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Get all of the incoming input data to loop through
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;
		let returnAll: boolean;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const fullOperation = `${resource}/${operation}`;


		const filterItemsFlow = [
			'player/recently-played',
			'albums/tracks',
			'artists/albums',
			'playlists/user-playlists',
			'playlists/tracks',
		];

		// Set initial values
		requestMethod = 'GET';
		endpoint = '';
		body = {};
		qs = {};
		returnAll = false;

		for(let i = 0; i < items.length; i++) {
			// -----------------------------
			//      Player Operations
			// -----------------------------
			if( resource === 'player' ) {
				endpoint = `/me/${resource}/${operation}`;

				if(['pause'].includes(operation)) {
					requestMethod = 'PUT';
				} else if(['recently-played', 'currently-playing'].includes(operation)) {
					requestMethod = 'GET';

					if(operation === 'recently-played') {
						returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if(!returnAll) {
							const limit = this.getNodeParameter('limit', 0) as number;

							qs = {
								'limit': limit
							};
						}
					}
				} else if(['next', 'previous'].includes(operation)) {
					requestMethod = 'POST';
				} else if(['play'].includes(operation)) {
					requestMethod = 'PUT';

					const id = this.getNodeParameter('id', i) as string;

					body.context_uri = id;
				} else if(['queue'].includes(operation)) {
					requestMethod = 'POST';

					const id = this.getNodeParameter('id', i) as string;

					qs = {
						'uri': id
					};
				}
			// -----------------------------
			//      Album Operations
			// -----------------------------
			} else if( resource === 'albums') {
				const uri = this.getNodeParameter('id', i) as string;

				const id = uri.replace('spotify:album:', '');

				requestMethod = 'GET';

				if(['album'].includes(operation)) {
					endpoint = `/${resource}/${id}`;
				} else if(['tracks'].includes(operation)) {
					endpoint = `/${resource}/${id}/${operation}`;

					returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					if(!returnAll) {
						const limit = this.getNodeParameter('limit', 0) as number;

						qs = {
							'limit': limit
						};
					}
				}
			// -----------------------------
			//      Artist Operations
			// -----------------------------
			} else if( resource === 'artists') {
				const uri = this.getNodeParameter('id', i) as string;

				const id = uri.replace('spotify:artist:', '');

				requestMethod = 'GET';

				endpoint = `/${resource}/${id}`;

				if(['albums','related-artists'].includes(operation)) {
					endpoint = endpoint + `/${operation}`;

					if(operation === 'albums') {
						returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if(!returnAll) {
							const limit = this.getNodeParameter('limit', 0) as number;

							qs = {
								'limit': limit
							};
						}
					}
				} else if(['top-tracks'].includes(operation)){
					const country = this.getNodeParameter('country', i) as string;

					qs = {
						'country': country
					};

					endpoint = endpoint + `/top-tracks`;
				}
			// -----------------------------
			//      Playlist Operations
			// -----------------------------
			} else if( resource === 'playlists') {
				if(['delete', 'get', 'tracks', 'add'].includes(operation)) {
					const uri = this.getNodeParameter('id', i) as string;

					const id = uri.replace('spotify:playlist:', '');

					if(['delete'].includes(operation)) {
						requestMethod = 'DELETE';
						const trackId = this.getNodeParameter('trackID', i) as string;

						body.tracks = [
							{
								"uri": `${trackId}`,
								"positions": [
								0
								]
							}
						];

						endpoint = `/${resource}/${id}/tracks`;
					} else if(['get'].includes(operation)) {
						requestMethod = 'GET';

						endpoint = `/${resource}/${id}`;
					} else if(['tracks'].includes(operation)) {
						requestMethod = 'GET';

						endpoint = `/${resource}/${id}/${operation}`;

						returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if(!returnAll) {
							const limit = this.getNodeParameter('limit', 0) as number;

							qs = {
								'limit': limit
							};
						}
					} else if(['add'].includes(operation)) {
						requestMethod = 'POST';

						const trackId = this.getNodeParameter('trackID', i) as string;

						qs = {
							'uris': trackId
						};

						endpoint = `/${resource}/${id}/tracks`;
					}
				} else if(['user-playlists'].includes(operation)) {
					requestMethod = 'GET';

					endpoint = `/me/${resource}`;

					returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					if(!returnAll) {
						const limit = this.getNodeParameter('limit', 0) as number;

						qs = {
							'limit': limit
						};
					}
				}
			// -----------------------------
			//      Track Operations
			// -----------------------------
			} else if( resource === 'tracks') {
				const uri = this.getNodeParameter('id', i) as string;

				const id = uri.replace('spotify:track:', '');

				requestMethod = 'GET';

				if(['audio-features'].includes(operation)) {
					endpoint = `/${operation}/${id}`;
				} else if(['tracks'].includes(operation)) {
					endpoint = `/${resource}/${id}`;
				}
			}

			let responseData;

			if(returnAll) {
				responseData = await spotifyApiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
			} else {
				responseData = [await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs)];
			}

			// Spotify returns the data in a way that makes processing individual items quite difficult, and so I simplify the output
			// for certain requests
			for(let i = 0; i < responseData.length; i++) {
				if(filterItemsFlow.includes(fullOperation)) {
					for(let j = 0; j < responseData[i].items.length; j++) {
						returnData.push(responseData[i].items[j]);
					}
				} else if(['artists/related-artists'].includes(fullOperation)) {
					for(let j = 0; j < responseData[i].artists.length; j++) {
						returnData.push(responseData[i].artists[j]);
					}
				} else if(['artists/top-tracks'].includes(fullOperation)) {
					for(let j = 0; j < responseData[i].tracks.length; j++) {
						returnData.push(responseData[i].tracks[j]);
					}
				} else {
					returnData.push(responseData[i]);
				}
			}
		}

		if( returnData[0] === undefined ) {
			return [this.helpers.returnJsonArray({ success: true })];
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
