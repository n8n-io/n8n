import {
	IPollFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import {
	spotifyApiRequestAllItems,
} from './GenericFunctions';

import * as moment from 'moment';

export class SpotifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spotify Trigger',
		name: 'spotifyTrigger',
		icon: 'file:spotify.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Spotify events occur',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Spotify Trigger',
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
						value: 'newSongAddedToPlaylist',
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
							'newSongAddedToPlaylist',
						],
					},
				},
				placeholder: 'spotify:playlist:37i9dQZF1DWUhI3iC1khPH',
				description: `The playlist's Spotify URI or its ID.`,
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {

		const webhookData = this.getWorkflowStaticData('node');

		const event = this.getNodeParameter('event') as string;

		let endpoint: string;

		if (event === 'newSongAddedToPlaylist') {

			const uri = this.getNodeParameter('id') as string;

			const id = uri.replace('spotify:playlist:', '');

			endpoint = `/playlists/${id}/tracks`;

		} else if(event === 'newLikedSong') {

			endpoint = '/me/tracks';

		} else {
			throw new Error(`The requested event "${event}" is not supported`);
		}

		const newTracks: IDataObject[] = [];

		const now = moment().format();

		const startDate = webhookData.lastTimeChecked as string || now;

		const endDate = now;

		const tracks = await spotifyApiRequestAllItems.call(this, 'items', 'GET', endpoint, {});

		webhookData.lastTimeChecked = endDate;

		for (const track of tracks) {

			const trackDate = moment(track.added_at);

			if(trackDate.isBetween(moment(startDate), moment(endDate))) {

				newTracks.push(track.track);
			}
		}

		if (Array.isArray(newTracks) && newTracks.length) {

			return [this.helpers.returnJsonArray(newTracks)];
		}

		return null;
	}
}
