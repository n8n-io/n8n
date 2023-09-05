import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import type { Readable } from 'stream';

import { googleApiRequest, googleApiRequestAllItems } from './GenericFunctions';

import { channelFields, channelOperations } from './ChannelDescription';

import { playlistFields, playlistOperations } from './PlaylistDescription';

import { playlistItemFields, playlistItemOperations } from './PlaylistItemDescription';

import { videoFields, videoOperations } from './VideoDescription';

import { videoCategoryFields, videoCategoryOperations } from './VideoCategoryDescription';

import { countriesCodes } from './CountryCodes';

const UPLOAD_CHUNK_SIZE = 1024 * 1024;

export class YouTube implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'YouTube',
		name: 'youTube',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:youTube.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume YouTube API',
		defaults: {
			name: 'YouTube',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'youTubeOAuth2Api',
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
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Playlist',
						value: 'playlist',
					},
					{
						name: 'Playlist Item',
						value: 'playlistItem',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Video Category',
						value: 'videoCategory',
					},
				],
				default: 'channel',
			},
			...channelOperations,
			...channelFields,

			...playlistOperations,
			...playlistFields,

			...playlistItemOperations,
			...playlistItemFields,

			...videoOperations,
			...videoFields,

			...videoCategoryOperations,
			...videoCategoryFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the languages to display them to user so that they can
			// select them easily
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const languages = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/youtube/v3/i18nLanguages',
				);
				for (const language of languages) {
					const languageName = language.id.toUpperCase();
					const languageId = language.id;
					returnData.push({
						name: languageName,
						value: languageId,
					});
				}
				return returnData;
			},
			// Get all the countries codes to display them to user so that they can
			// select them easily
			async getCountriesCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const countryCode of countriesCodes) {
					const countryCodeName = `${countryCode.name} - ${countryCode.alpha2}`;
					const countryCodeId = countryCode.alpha2;
					returnData.push({
						name: countryCodeName,
						value: countryCodeId,
					});
				}
				return returnData;
			},
			// Get all the video categories to display them to user so that they can
			// select them easily
			async getVideoCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const countryCode = this.getCurrentNodeParameter('regionCode') as string;

				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.regionCode = countryCode;
				qs.part = 'snippet';
				const categories = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/youtube/v3/videoCategories',
					{},
					qs,
				);
				for (const category of categories) {
					const categoryName = category.snippet.title;
					const categoryId = category.id;
					returnData.push({
						name: categoryName,
						value: categoryId,
					});
				}
				return returnData;
			},
			// Get all the playlists to display them to user so that they can
			// select them easily
			async getPlaylists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				qs.part = 'snippet';
				qs.mine = true;
				const playlists = await googleApiRequestAllItems.call(
					this,
					'items',
					'GET',
					'/youtube/v3/playlists',
					{},
					qs,
				);
				for (const playlist of playlists) {
					const playlistName = playlist.snippet.title;
					const playlistId = playlist.id;
					returnData.push({
						name: playlistName,
						value: playlistId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'channel') {
					if (operation === 'get') {
						//https://developers.google.com/youtube/v3/docs/channels/list
						let part = this.getNodeParameter('part', i) as string[];
						const channelId = this.getNodeParameter('channelId', i) as string;

						if (part.includes('*')) {
							part = [
								'brandingSettings',
								'contentDetails',
								'contentOwnerDetails',
								'id',
								'localizations',
								'snippet',
								'statistics',
								'status',
								'topicDetails',
							];
						}

						qs.part = part.join(',');

						qs.id = channelId;

						responseData = await googleApiRequest.call(this, 'GET', '/youtube/v3/channels', {}, qs);

						responseData = responseData.items;
					}
					//https://developers.google.com/youtube/v3/docs/channels/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						let part = this.getNodeParameter('part', i) as string[];
						const options = this.getNodeParameter('options', i);
						const filters = this.getNodeParameter('filters', i);

						if (part.includes('*')) {
							part = [
								'brandingSettings',
								'contentDetails',
								'contentOwnerDetails',
								'id',
								'localizations',
								'snippet',
								'statistics',
								'status',
								'topicDetails',
							];
						}

						qs.part = part.join(',');

						Object.assign(qs, options, filters);

						qs.mine = true;

						if (qs.categoryId || qs.forUsername || qs.id || qs.managedByMe) {
							delete qs.mine;
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/youtube/v3/channels',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/youtube/v3/channels',
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
					//https://developers.google.com/youtube/v3/docs/channels/update
					if (operation === 'update') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						const body: IDataObject = {
							id: channelId,
							brandingSettings: {
								channel: {},
								image: {},
							},
						};

						qs.part = 'brandingSettings';

						if (updateFields.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = updateFields.onBehalfOfContentOwner as string;
						}

						if (updateFields.brandingSettingsUi) {
							const channelSettingsValues = (updateFields.brandingSettingsUi as IDataObject)
								.channelSettingsValues as IDataObject | undefined;
							const channelSettings: IDataObject = {};
							if (channelSettingsValues?.channel) {
								const channelSettingsOptions = channelSettingsValues.channel as IDataObject;
								if (channelSettingsOptions.country) {
									channelSettings.country = channelSettingsOptions.country;
								}
								if (channelSettingsOptions.description) {
									channelSettings.description = channelSettingsOptions.description;
								}
								if (channelSettingsOptions.defaultLanguage) {
									channelSettings.defaultLanguage = channelSettingsOptions.defaultLanguage;
								}
								if (channelSettingsOptions.defaultTab) {
									channelSettings.defaultTab = channelSettingsOptions.defaultTab;
								}
								if (channelSettingsOptions.featuredChannelsTitle) {
									channelSettings.featuredChannelsTitle =
										channelSettingsOptions.featuredChannelsTitle;
								}
								if (channelSettingsOptions.featuredChannelsUrls) {
									channelSettings.featuredChannelsUrls =
										channelSettingsOptions.featuredChannelsUrls;
								}
								if (channelSettingsOptions.keywords) {
									channelSettings.keywords = channelSettingsOptions.keywords;
								}
								if (channelSettingsOptions.moderateComments) {
									channelSettings.moderateComments =
										channelSettingsOptions.moderateComments as boolean;
								}
								if (channelSettingsOptions.profileColor) {
									channelSettings.profileColor = channelSettingsOptions.profileColor as string;
								}
								if (channelSettingsOptions.profileColor) {
									channelSettings.profileColor = channelSettingsOptions.profileColor as string;
								}
								if (channelSettingsOptions.showRelatedChannels) {
									channelSettings.showRelatedChannels =
										channelSettingsOptions.showRelatedChannels as boolean;
								}
								if (channelSettingsOptions.showBrowseView) {
									channelSettings.showBrowseView = channelSettingsOptions.showBrowseView as boolean;
								}
								if (channelSettingsOptions.trackingAnalyticsAccountId) {
									channelSettings.trackingAnalyticsAccountId =
										channelSettingsOptions.trackingAnalyticsAccountId as string;
								}
								if (channelSettingsOptions.unsubscribedTrailer) {
									channelSettings.unsubscribedTrailer =
										channelSettingsOptions.unsubscribedTrailer as string;
								}
							}

							const imageSettingsValues = (updateFields.brandingSettingsUi as IDataObject)
								.imageSettingsValues as IDataObject | undefined;
							const imageSettings: IDataObject = {};
							if (imageSettingsValues?.image) {
								const imageSettingsOptions = imageSettings.image as IDataObject;
								if (imageSettingsOptions.bannerExternalUrl) {
									imageSettings.bannerExternalUrl =
										imageSettingsOptions.bannerExternalUrl as string;
								}
								if (imageSettingsOptions.trackingImageUrl) {
									imageSettings.trackingImageUrl = imageSettingsOptions.trackingImageUrl as string;
								}
								if (imageSettingsOptions.watchIconImageUrl) {
									imageSettings.watchIconImageUrl =
										imageSettingsOptions.watchIconImageUrl as string;
								}
							}

							//@ts-ignore
							body.brandingSettings.channel = channelSettings;
							//@ts-ignore
							body.brandingSettings.image = imageSettings;
						}

						responseData = await googleApiRequest.call(
							this,
							'PUT',
							'/youtube/v3/channels',
							body,
							qs,
						);
					}
					//https://developers.google.com/youtube/v3/docs/channelBanners/insert
					if (operation === 'uploadBanner') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						const binaryProperty = this.getNodeParameter('binaryProperty', i);
						const binaryData = this.helpers.assertBinaryData(i, binaryProperty);
						const body = await this.helpers.getBinaryDataBuffer(i, binaryProperty);

						const requestOptions = {
							headers: {
								...(binaryData.mimeType ? { 'Content-Type': binaryData.mimeType } : {}),
							},
							json: false,
						};

						const response = await googleApiRequest.call(
							this,
							'POST',
							'/upload/youtube/v3/channelBanners/insert',
							body,
							qs,
							undefined,
							requestOptions,
						);

						const { url } = JSON.parse(response as string);

						qs.part = 'brandingSettings';

						responseData = await googleApiRequest.call(
							this,
							'PUT',
							'/youtube/v3/channels',
							{
								id: channelId,
								brandingSettings: {
									image: {
										bannerExternalUrl: url,
									},
								},
							},
							qs,
						);
					}
				}
				if (resource === 'playlist') {
					//https://developers.google.com/youtube/v3/docs/playlists/list
					if (operation === 'get') {
						let part = this.getNodeParameter('part', i) as string[];
						const playlistId = this.getNodeParameter('playlistId', i) as string;
						const options = this.getNodeParameter('options', i);

						if (part.includes('*')) {
							part = ['contentDetails', 'id', 'localizations', 'player', 'snippet', 'status'];
						}

						qs.part = part.join(',');

						qs.id = playlistId;

						Object.assign(qs, options);

						responseData = await googleApiRequest.call(
							this,
							'GET',
							'/youtube/v3/playlists',
							{},
							qs,
						);

						responseData = responseData.items;
					}
					//https://developers.google.com/youtube/v3/docs/playlists/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						let part = this.getNodeParameter('part', i) as string[];
						const options = this.getNodeParameter('options', i);
						const filters = this.getNodeParameter('filters', i);

						if (part.includes('*')) {
							part = ['contentDetails', 'id', 'localizations', 'player', 'snippet', 'status'];
						}

						qs.part = part.join(',');

						Object.assign(qs, options, filters);

						qs.mine = true;

						if (qs.channelId || qs.id) {
							delete qs.mine;
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/youtube/v3/playlists',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/youtube/v3/playlists',
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
					//https://developers.google.com/youtube/v3/docs/playlists/insert
					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;
						const options = this.getNodeParameter('options', i);

						qs.part = 'snippet';

						const body: IDataObject = {
							snippet: {
								title,
							},
						};

						if (options.tags) {
							//@ts-ignore
							body.snippet.tags = (options.tags as string).split(',');
						}

						if (options.description) {
							//@ts-ignore
							body.snippet.privacyStatus = options.privacyStatus as string;
						}

						if (options.defaultLanguage) {
							//@ts-ignore
							body.snippet.defaultLanguage = options.defaultLanguage as string;
						}

						if (options.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = options.onBehalfOfContentOwner as string;
						}

						if (options.onBehalfOfContentOwnerChannel) {
							qs.onBehalfOfContentOwnerChannel = options.onBehalfOfContentOwnerChannel as string;
						}

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/youtube/v3/playlists',
							body,
							qs,
						);
					}
					//https://developers.google.com/youtube/v3/docs/playlists/update
					if (operation === 'update') {
						const playlistId = this.getNodeParameter('playlistId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						qs.part = 'snippet, status';

						const body: IDataObject = {
							id: playlistId,
							snippet: {
								title,
							},
							status: {},
						};

						if (updateFields.tags) {
							//@ts-ignore
							body.snippet.tags = (updateFields.tags as string).split(',');
						}

						if (updateFields.privacyStatus) {
							//@ts-ignore
							body.status.privacyStatus = updateFields.privacyStatus as string;
						}

						if (updateFields.description) {
							//@ts-ignore
							body.snippet.description = updateFields.description as string;
						}

						if (updateFields.defaultLanguage) {
							//@ts-ignore
							body.snippet.defaultLanguage = updateFields.defaultLanguage as string;
						}

						if (updateFields.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = updateFields.onBehalfOfContentOwner as string;
						}

						responseData = await googleApiRequest.call(
							this,
							'PUT',
							'/youtube/v3/playlists',
							body,
							qs,
						);
					}
					//https://developers.google.com/youtube/v3/docs/playlists/delete
					if (operation === 'delete') {
						const playlistId = this.getNodeParameter('playlistId', i) as string;
						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							id: playlistId,
						};

						if (options.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = options.onBehalfOfContentOwner as string;
						}

						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							'/youtube/v3/playlists',
							body,
						);

						responseData = { success: true };
					}
				}
				if (resource === 'playlistItem') {
					//https://developers.google.com/youtube/v3/docs/playlistItems/list
					if (operation === 'get') {
						let part = this.getNodeParameter('part', i) as string[];
						const playlistItemId = this.getNodeParameter('playlistItemId', i) as string;
						const options = this.getNodeParameter('options', i);

						if (part.includes('*')) {
							part = ['contentDetails', 'id', 'snippet', 'status'];
						}

						qs.part = part.join(',');

						qs.id = playlistItemId;

						Object.assign(qs, options);

						responseData = await googleApiRequest.call(
							this,
							'GET',
							'/youtube/v3/playlistItems',
							{},
							qs,
						);

						responseData = responseData.items;
					}
					//https://developers.google.com/youtube/v3/docs/playlistItems/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						let part = this.getNodeParameter('part', i) as string[];
						const options = this.getNodeParameter('options', i);
						const playlistId = this.getNodeParameter('playlistId', i) as string;
						//const filters = this.getNodeParameter('filters', i);

						if (part.includes('*')) {
							part = ['contentDetails', 'id', 'snippet', 'status'];
						}

						qs.playlistId = playlistId;

						qs.part = part.join(',');

						Object.assign(qs, options);

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/youtube/v3/playlistItems',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(
								this,
								'GET',
								'/youtube/v3/playlistItems',
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
					//https://developers.google.com/youtube/v3/docs/playlistItems/insert
					if (operation === 'add') {
						const playlistId = this.getNodeParameter('playlistId', i) as string;
						const videoId = this.getNodeParameter('videoId', i) as string;
						const options = this.getNodeParameter('options', i);

						qs.part = 'snippet, contentDetails';

						const body: IDataObject = {
							snippet: {
								playlistId,
								resourceId: {
									kind: 'youtube#video',
									videoId,
								},
							},
							contentDetails: {},
						};

						if (options.position) {
							//@ts-ignore
							body.snippet.position = options.position as number;
						}

						if (options.note) {
							//@ts-ignore
							body.contentDetails.note = options.note as string;
						}

						if (options.startAt) {
							//@ts-ignore
							body.contentDetails.startAt = options.startAt as string;
						}

						if (options.endAt) {
							//@ts-ignore
							body.contentDetails.endAt = options.endAt as string;
						}

						if (options.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = options.onBehalfOfContentOwner as string;
						}

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/youtube/v3/playlistItems',
							body,
							qs,
						);
					}
					//https://developers.google.com/youtube/v3/docs/playlistItems/delete
					if (operation === 'delete') {
						const playlistItemId = this.getNodeParameter('playlistItemId', i) as string;
						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							id: playlistItemId,
						};

						if (options.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = options.onBehalfOfContentOwner as string;
						}

						responseData = await googleApiRequest.call(
							this,
							'DELETE',
							'/youtube/v3/playlistItems',
							body,
						);

						responseData = { success: true };
					}
				}
				if (resource === 'video') {
					//https://developers.google.com/youtube/v3/docs/search/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const options = this.getNodeParameter('options', i);
						const filters = this.getNodeParameter('filters', i);

						qs.part = 'snippet';

						qs.type = 'video';

						qs.forMine = true;

						Object.assign(qs, options, filters);

						if (Object.keys(filters).length > 0) {
							delete qs.forMine;
						}

						if (qs.relatedToVideoId && qs.forDeveloper !== undefined) {
							throw new NodeOperationError(
								this.getNode(),
								"When using the parameter 'related to video' the parameter 'for developer' cannot be set",
								{ itemIndex: i },
							);
						}

						if (returnAll) {
							responseData = await googleApiRequestAllItems.call(
								this,
								'items',
								'GET',
								'/youtube/v3/search',
								{},
								qs,
							);
						} else {
							qs.maxResults = this.getNodeParameter('limit', i);
							responseData = await googleApiRequest.call(this, 'GET', '/youtube/v3/search', {}, qs);
							responseData = responseData.items;
						}
					}
					//https://developers.google.com/youtube/v3/docs/videos/list?hl=en
					if (operation === 'get') {
						let part = this.getNodeParameter('part', i) as string[];
						const videoId = this.getNodeParameter('videoId', i) as string;
						const options = this.getNodeParameter('options', i);

						if (part.includes('*')) {
							part = [
								'contentDetails',
								'id',
								'liveStreamingDetails',
								'localizations',
								'player',
								'recordingDetails',
								'snippet',
								'statistics',
								'status',
								'topicDetails',
							];
						}

						qs.part = part.join(',');

						qs.id = videoId;

						Object.assign(qs, options);

						responseData = await googleApiRequest.call(this, 'GET', '/youtube/v3/videos', {}, qs);

						responseData = responseData.items;
					}
					//https://developers.google.com/youtube/v3/guides/uploading_a_video?hl=en
					if (operation === 'upload') {
						const title = this.getNodeParameter('title', i) as string;
						const categoryId = this.getNodeParameter('categoryId', i) as string;
						const options = this.getNodeParameter('options', i);
						const binaryProperty = this.getNodeParameter('binaryProperty', i);

						const binaryData = this.helpers.assertBinaryData(i, binaryProperty);

						let mimeType: string;
						let contentLength: number;
						let fileContent: Buffer | Readable;

						if (binaryData.id) {
							// Stream data in 256KB chunks, and upload the via the resumable upload api
							fileContent = this.helpers.getBinaryStream(binaryData.id, UPLOAD_CHUNK_SIZE);
							const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
							contentLength = metadata.fileSize;
							mimeType = metadata.mimeType ?? binaryData.mimeType;
						} else {
							fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
							contentLength = fileContent.length;
							mimeType = binaryData.mimeType;
						}

						const payload = {
							snippet: {
								title,
								categoryId,
								description: options.description,
								tags: (options.tags as string)?.split(','),
								defaultLanguage: options.defaultLanguage,
							},
							status: {
								privacyStatus: options.privacyStatus,
								embeddable: options.embeddable,
								publicStatsViewable: options.publicStatsViewable,
								publishAt: options.publishAt,
								selfDeclaredMadeForKids: options.selfDeclaredMadeForKids,
								license: options.license,
							},
							recordingDetails: {
								recordingDate: options.recordingDate,
							},
						};

						const resumableUpload = await googleApiRequest.call(
							this,
							'POST',
							'/upload/youtube/v3/videos',
							payload,
							{
								uploadType: 'resumable',
								part: 'snippet,status,recordingDetails',
								notifySubscribers: options.notifySubscribers ?? false,
							},
							undefined,
							{
								headers: {
									'X-Upload-Content-Length': contentLength,
									'X-Upload-Content-Type': mimeType,
								},
								json: true,
								resolveWithFullResponse: true,
							},
						);

						const uploadUrl = resumableUpload.headers.location;

						let uploadId;
						let offset = 0;
						for await (const chunk of fileContent) {
							const nextOffset = offset + Number(chunk.length);
							try {
								const response = await this.helpers.httpRequest({
									method: 'PUT',
									url: uploadUrl,
									headers: {
										'Content-Length': chunk.length,
										'Content-Range': `bytes ${offset}-${nextOffset - 1}/${contentLength}`,
									},
									body: chunk,
								});
								uploadId = response.id;
							} catch (error) {
								if (error.response?.status !== 308) throw error;
							}
							offset = nextOffset;
						}

						responseData = { uploadId, ...resumableUpload.body };
					}
					//https://developers.google.com/youtube/v3/docs/playlists/update
					if (operation === 'update') {
						const id = this.getNodeParameter('videoId', i) as string;
						const title = this.getNodeParameter('title', i) as string;
						const categoryId = this.getNodeParameter('categoryId', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);

						qs.part = 'snippet, status, recordingDetails';

						const body = {
							id,
							snippet: {
								title,
								categoryId,
							},
							status: {},
							recordingDetails: {},
						};

						if (updateFields.description) {
							//@ts-ignore
							body.snippet.description = updateFields.description as string;
						}

						if (updateFields.privacyStatus) {
							//@ts-ignore
							body.status.privacyStatus = updateFields.privacyStatus as string;
						}

						if (updateFields.tags) {
							//@ts-ignore
							body.snippet.tags = (updateFields.tags as string).split(',');
						}

						if (updateFields.embeddable) {
							//@ts-ignore
							body.status.embeddable = updateFields.embeddable as boolean;
						}

						if (updateFields.publicStatsViewable) {
							//@ts-ignore
							body.status.publicStatsViewable = updateFields.publicStatsViewable as boolean;
						}

						if (updateFields.publishAt) {
							//@ts-ignore
							body.status.publishAt = updateFields.publishAt as string;
						}

						if (updateFields.selfDeclaredMadeForKids) {
							//@ts-ignore
							body.status.selfDeclaredMadeForKids = updateFields.selfDeclaredMadeForKids as boolean;
						}

						if (updateFields.recordingDate) {
							//@ts-ignore
							body.recordingDetails.recordingDate = updateFields.recordingDate as string;
						}

						if (updateFields.license) {
							//@ts-ignore
							body.status.license = updateFields.license as string;
						}

						if (updateFields.defaultLanguage) {
							//@ts-ignore
							body.snippet.defaultLanguage = updateFields.defaultLanguage as string;
						}

						responseData = await googleApiRequest.call(this, 'PUT', '/youtube/v3/videos', body, qs);
					}
					//https://developers.google.com/youtube/v3/docs/videos/delete?hl=en
					if (operation === 'delete') {
						const videoId = this.getNodeParameter('videoId', i) as string;
						const options = this.getNodeParameter('options', i);

						const body: IDataObject = {
							id: videoId,
						};

						if (options.onBehalfOfContentOwner) {
							qs.onBehalfOfContentOwner = options.onBehalfOfContentOwner as string;
						}

						responseData = await googleApiRequest.call(this, 'DELETE', '/youtube/v3/videos', body);

						responseData = { success: true };
					}
					//https://developers.google.com/youtube/v3/docs/videos/rate?hl=en
					if (operation === 'rate') {
						const videoId = this.getNodeParameter('videoId', i) as string;
						const rating = this.getNodeParameter('rating', i) as string;

						const body: IDataObject = {
							id: videoId,
							rating,
						};

						responseData = await googleApiRequest.call(
							this,
							'POST',
							'/youtube/v3/videos/rate',
							body,
						);

						responseData = { success: true };
					}
				}
				if (resource === 'videoCategory') {
					//https://developers.google.com/youtube/v3/docs/videoCategories/list
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const regionCode = this.getNodeParameter('regionCode', i) as string;

						qs.regionCode = regionCode;

						qs.part = 'snippet';

						responseData = await googleApiRequest.call(
							this,
							'GET',
							'/youtube/v3/videoCategories',
							{},
							qs,
						);
						responseData = responseData.items;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return [returnData];
	}
}
