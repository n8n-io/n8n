import {
	IExecuteFunctions,
} from 'n8n-core';

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

import {
	isoCountryCodes
} from './IsoCountryCodes';

export class Spotify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spotify',
		name: 'spotify',
		icon: 'file:spotify.svg',
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
				name: 'spotifyOAuth2Api',
				required: true,
			},
		],
		properties: [
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
						name: 'Album',
						value: 'album',
					},
					{
						name: 'Artist',
						value: 'artist',
					},
					{
						name: 'Library',
						value: 'library',
					},
					{
						name: 'Player',
						value: 'player',
					},
					{
						name: 'Playlist',
						value: 'playlist',
					},
					{
						name: 'Track',
						value: 'track',
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
						name: 'Add Song to Queue',
						value: 'addSongToQueue',
						description: 'Add a song to your queue.',
					},
					{
						name: 'Currently Playing',
						value: 'currentlyPlaying',
						description: 'Get your currently playing track.',
					},
					{
						name: 'Next Song',
						value: 'nextSong',
						description: 'Skip to your next track.',
					},
					{
						name: 'Pause',
						value: 'pause',
						description: 'Pause your music.',
					},
					{
						name: 'Previous Song',
						value: 'previousSong',
						description: 'Skip to your previous song.',
					},
					{
						name: 'Recently Played',
						value: 'recentlyPlayed',
						description: 'Get your recently played tracks.',
					},
					{
						name: 'Start Music',
						value: 'startMusic',
						description: 'Start playing a playlist, artist, or album.',
					},
				],
				default: 'addSongToQueue',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Resource ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'player',
						],
						operation: [
							'startMusic',
						],
					},
				},
				placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
				description: `Enter a playlist, artist, or album URI or ID.`,
			},
			{
				displayName: 'Track ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'player',
						],
						operation: [
							'addSongToQueue',
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `Enter a track URI or ID.`,
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
							'album',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get an album by URI or ID.',
					},
					{
						name: 'Get New Releases',
						value: 'getNewReleases',
						description: 'Get a list of new album releases.',
					},
					{
						name: `Get Tracks`,
						value: 'getTracks',
						description: `Get an album's tracks by URI or ID.`,
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Album ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'album',
						],
						operation: [
							'get',
							'getTracks',
						],
					},
				},
				placeholder: 'spotify:album:1YZ3k65Mqw3G8FzYlW1mmp',
				description: `The album's Spotify URI or ID.`,
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
							'artist',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get an artist by URI or ID.',
					},
					{
						name: `Get Albums`,
						value: 'getAlbums',
						description: `Get an artist's albums by URI or ID.`,
					},
					{
						name: `Get Related Artists`,
						value: 'getRelatedArtists',
						description: `Get an artist's related artists by URI or ID.`,
					},
					{
						name: `Get Top Tracks`,
						value: 'getTopTracks',
						description: `Get an artist's top tracks by URI or ID.`,
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Artist ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'artist',
						],
					},
				},
				placeholder: 'spotify:artist:4LLpKhyESsyAXpc4laK94U',
				description: `The artist's Spotify URI or ID.`,
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
							'artist',
						],
						operation: [
							'getTopTracks',
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
							'playlist',
						],
					},
				},
				options: [
					{
						name: 'Add an Item',
						value: 'add',
						description: 'Add tracks from a playlist by track and playlist URI or ID.',
					},
					{
						name: 'Create a Playlist',
						value: 'create',
						description: 'Create a new playlist.',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a playlist by URI or ID.',
					},
					{
						name: 'Get Tracks',
						value: 'getTracks',
						description: `Get a playlist's tracks by URI or ID.`,
					},
					{
						name: `Get the User's Playlists`,
						value: 'getUserPlaylists',
						description: `Get a user's playlists.`,
					},
					{
						name: 'Remove an Item',
						value: 'delete',
						description: 'Remove tracks from a playlist by track and playlist URI or ID.',
					},
				],
				default: 'add',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Playlist ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'playlist',
						],
						operation: [
							'add',
							'delete',
							'get',
							'getTracks',
						],
					},
				},
				placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
				description: `The playlist's Spotify URI or its ID.`,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'playlist',
						],
						operation: [
							'create',
						],
					},
				},
				placeholder: 'Favorite Songs',
				description: 'Name of the playlist to create.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'playlist',
						],
						operation: [
							'create',
						],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						placeholder: 'These are all my favorite songs.',
						description: 'Description for the playlist to create.',
					},
					{
						displayName: 'Public',
						name: 'public',
						type: 'boolean',
						default: true,
						description: 'Whether the playlist is publicly accessible.',
					},
				],
			},
			{
				displayName: 'Track ID',
				name: 'trackID',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'playlist',
						],
						operation: [
							'add',
							'delete',
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `The track's Spotify URI or its ID. The track to add/delete from the playlist.`,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'playlist',
						],
						operation: [
							'add',
						],
					},
				},
				options: [
					{
						displayName: 'Position',
						name: 'position',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						placeholder: '0',
						description: `The new track's position in the playlist.`,
					},
				],
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
							'track',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a track by its URI or ID.',
					},
					{
						name: 'Get Audio Features',
						value: 'getAudioFeatures',
						description: 'Get audio features for a track by URI or ID.',
					},
				],
				default: 'track',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Track ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'track',
						],
					},
				},
				placeholder: 'spotify:track:0xE4LEFzSNGsz1F6kvXsHU',
				description: `The track's Spotify URI or ID.`,
			},
			// --------------------------------------------------------------------------------------------------------
			//         Library Operations
			//		   Get liked tracks
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'library',
						],
					},
				},
				options: [
					{
						name: 'Get Liked Tracks',
						value: 'getLikedTracks',
						description: `Get the user's liked tracks.`,
					},
				],
				default: 'getLikedTracks',
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
							'album',
							'artist',
							'library',
							'playlist',
						],
						operation: [
							'getTracks',
							'getAlbums',
							'getUserPlaylists',
							'getNewReleases',
							'getLikedTracks',
						],
					},
				},
				description: `The number of items to return.`,
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				required: true,
				displayOptions: {
					show: {
						resource: [
							'album',
							'artist',
							'library',
							'playlist',
						],
						operation: [
							'getTracks',
							'getAlbums',
							'getUserPlaylists',
							'getNewReleases',
							'getLikedTracks',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				description: `The number of items to return.`,
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				required: true,
				displayOptions: {
					show: {
						resource: [
							'player',
						],
						operation: [
							'recentlyPlayed',
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
				description: `The number of items to return.`,
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'album',
						],
						operation: [
							'getNewReleases',
						],
					},
				},
				options: [
					{
						displayName: 'Country',
						name: 'country',
						type: 'options',
						default: 'US',
						options: isoCountryCodes.map(({ name, alpha2 }) => ({ name, value: alpha2 })),
						description: 'Country to filter new releases by.',
					},
				],
			},
		],
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
		let propertyName = '';
		let responseData;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;

		// Set initial values
		requestMethod = 'GET';
		endpoint = '';
		body = {};
		qs = {};
		returnAll = false;

		for (let i = 0; i < items.length; i++) {
			if (resource === 'player') {

				// -----------------------------
				//      Player Operations
				// -----------------------------

				if (operation === 'pause') {
					requestMethod = 'PUT';

					endpoint = `/me/player/pause`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = { success: true };

				} else if (operation === 'recentlyPlayed') {
					requestMethod = 'GET';

					endpoint = `/me/player/recently-played`;

					const limit = this.getNodeParameter('limit', i) as number;

					qs = {
						limit,
					};

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = responseData.items;

				} else if (operation === 'currentlyPlaying') {
					requestMethod = 'GET';

					endpoint = `/me/player/currently-playing`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

				} else if (operation === 'nextSong') {
					requestMethod = 'POST';

					endpoint = `/me/player/next`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = { success: true };

				} else if (operation === 'previousSong') {
					requestMethod = 'POST';

					endpoint = `/me/player/previous`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = { success: true };

				} else if (operation === 'startMusic') {
					requestMethod = 'PUT';

					endpoint = `/me/player/play`;

					const id = this.getNodeParameter('id', i) as string;

					body.context_uri = id;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = { success: true };

				} else if (operation === 'addSongToQueue') {
					requestMethod = 'POST';

					endpoint = `/me/player/queue`;

					const id = this.getNodeParameter('id', i) as string;

					qs = {
						uri: id,
					};

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = { success: true };
				}

			} else if (resource === 'album') {

				// -----------------------------
				//      Album Operations
				// -----------------------------

				if (operation === 'get') {
					const uri = this.getNodeParameter('id', i) as string;

					const id = uri.replace('spotify:album:', '');

					requestMethod = 'GET';

					endpoint = `/albums/${id}`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

				} else if (operation === 'getNewReleases') {

					endpoint = '/browse/new-releases';
					requestMethod = 'GET';

					const filters = this.getNodeParameter('filters', i) as IDataObject;

					if (Object.keys(filters).length) {
						Object.assign(qs, filters);
					}

					returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (!returnAll) {
						qs.limit = this.getNodeParameter('limit', i);
						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = responseData.albums.items;
					}

				} else if (operation === 'getTracks') {
					const uri = this.getNodeParameter('id', i) as string;

					const id = uri.replace('spotify:album:', '');

					requestMethod = 'GET';

					endpoint = `/albums/${id}/tracks`;

					propertyName = 'tracks';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;

					propertyName = 'items';

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;

						qs = {
							limit,
						};

						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

						responseData = responseData.items;
					}
				}

			} else if (resource === 'artist') {

				// -----------------------------
				//      Artist Operations
				// -----------------------------

				const uri = this.getNodeParameter('id', i) as string;

				const id = uri.replace('spotify:artist:', '');

				if (operation === 'getAlbums') {

					endpoint = `/artists/${id}/albums`;

					returnAll = this.getNodeParameter('returnAll', i) as boolean;

					propertyName = 'items';

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;

						qs = {
							limit,
						};

						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

						responseData = responseData.items;
					}

				} else if (operation === 'getRelatedArtists') {

					endpoint = `/artists/${id}/related-artists`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = responseData.artists;

				} else if (operation === 'getTopTracks') {
					const country = this.getNodeParameter('country', i) as string;

					qs = {
						country,
					};

					endpoint = `/artists/${id}/top-tracks`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = responseData.tracks;

				} else if (operation === 'get') {

					requestMethod = 'GET';

					endpoint = `/artists/${id}`;

					responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);
				}

			} else if (resource === 'playlist') {

				// -----------------------------
				//      Playlist Operations
				// -----------------------------

				if (['delete', 'get', 'getTracks', 'add'].includes(operation)) {
					const uri = this.getNodeParameter('id', i) as string;

					const id = uri.replace('spotify:playlist:', '');

					if (operation === 'delete') {
						requestMethod = 'DELETE';
						const trackId = this.getNodeParameter('trackID', i) as string;

						body.tracks = [
							{
								uri: trackId,
							},
						];

						endpoint = `/playlists/${id}/tracks`;

						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

						responseData = { success: true };

					} else if (operation === 'get') {
						requestMethod = 'GET';

						endpoint = `/playlists/${id}`;

						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

					} else if (operation === 'getTracks') {
						requestMethod = 'GET';

						endpoint = `/playlists/${id}/tracks`;

						returnAll = this.getNodeParameter('returnAll', i) as boolean;

						propertyName = 'items';

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;

							qs = {
								'limit': limit,
							};

							responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

							responseData = responseData.items;
						}
					} else if (operation === 'add') {
						requestMethod = 'POST';

						const trackId = this.getNodeParameter('trackID', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						qs = {
							uris: trackId,
						};

						if (additionalFields.position !== undefined) {
							qs.position = additionalFields.position;
						}

						endpoint = `/playlists/${id}/tracks`;

						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);
					}
				} else if (operation === 'getUserPlaylists') {
					requestMethod = 'GET';

					endpoint = '/me/playlists';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;

					propertyName = 'items';

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;

						qs = {
							limit,
						};

						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

						responseData = responseData.items;
					}

				} else if (operation === 'create') {

					// https://developer.spotify.com/console/post-playlists/

					body.name = this.getNodeParameter('name', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(body, additionalFields);
					}

					responseData = await spotifyApiRequest.call(this, 'POST', '/me/playlists', body, qs);
				}

			} else if (resource === 'track') {

				// -----------------------------
				//      Track Operations
				// -----------------------------

				const uri = this.getNodeParameter('id', i) as string;

				const id = uri.replace('spotify:track:', '');

				requestMethod = 'GET';

				if (operation === 'getAudioFeatures') {
					endpoint = `/audio-features/${id}`;
				} else if (operation === 'get') {
					endpoint = `/tracks/${id}`;
				}

				responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

			} else if (resource === 'library') {

				// -----------------------------
				//      Library Operations
				// -----------------------------

				if (operation === 'getLikedTracks') {
					requestMethod = 'GET';

					endpoint = '/me/tracks';

					returnAll = this.getNodeParameter('returnAll', i) as boolean;

					propertyName = 'items';

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;

						qs = {
							limit,
						};

						responseData = await spotifyApiRequest.call(this, requestMethod, endpoint, body, qs);

						responseData = responseData.items;
					}
				}
			}

			if (returnAll) {
				responseData = await spotifyApiRequestAllItems.call(this, propertyName, requestMethod, endpoint, body, qs);
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
