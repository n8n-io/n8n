import { IPollFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { spotifyApiRequestAllItems } from './GenericFunctions';

export class SpotifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spotify Trigger',
		name: 'spotifyTrigger',
		icon: 'file:spotify.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Spotify events occure',
		defaults: {
			name: 'Spotify',
			color: '#1DB954',
		},
		credentials: [
			{
				name: 'spotifyOAuth2Api',
				required: true,
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'New Song Added to Playlist',
						value: 'newSongAdded',
					},
					{
						name: 'New Liked Song',
						value: 'newLikedSong',
					},
				],
				required: true,
				default: 'newSongAdded',
			},
			{
				displayName: 'Playlist ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						event: [
							'newSongAdded'
						]
					},
				},
				placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
				description: `The playlist's Spotify URI or its ID.`,
			},
		]
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event') as string;
		let endpoint: string;

		if (event === 'newSongAdded') {
			const uri = this.getNodeParameter('id') as string;

			const id = uri.replace('spotify:playlist:', '');

			endpoint = `/playlists/${id}/tracks`;
		} else if(event === 'newLikedSong') {
			endpoint = '/me/tracks';
		} else {
			throw new Error(`The defined event "${event}" is not supported`);
		}

		let songs = [];
		const newSongs = [];
		const start= webhookData.lastTimeChecked as string;
		const endDate = new Date();

		const startDate = new Date(start);

		try {
			songs = await spotifyApiRequestAllItems.call(this, 'items', 'GET', endpoint, {});
			webhookData.lastTimeChecked = endDate;

			for(let i = 0; i < songs.length; i++) {
				const songDate = new Date(songs[i].added_at);
				if(startDate && songDate > startDate && songDate < endDate) {
					newSongs.push(songs[i].track);
				}
			}
		} catch (err) {
			throw new Error(`Spotify Trigger Error: ${err}`);
		}
		if (Array.isArray(newSongs) && newSongs.length !== 0) {
			return [this.helpers.returnJsonArray(newSongs)];
		}

		return null;
	}

}
