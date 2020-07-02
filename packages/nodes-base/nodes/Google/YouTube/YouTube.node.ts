import {
	IExecuteFunctions, BINARY_ENCODING,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
} from './GenericFunctions';

import {
	channelOperations,
	channelFields,
} from './ChannelDescription';

export class YouTube implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Youtube',
		name: 'youTube',
		icon: 'file:youTube.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume YouTube API.',
		defaults: {
			name: 'YouTube',
			color: '#FF0000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'youTubeOAuth2Api',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Channel',
						value: 'channel',
					},
				],
				default: 'channel',
				description: 'The resource to operate on.'
			},
			...channelOperations,
			...channelFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the languages to display them to user so that he can
			// select them easily
			async getLanguages(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
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
						value: languageId
					});
				}
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = (items.length as unknown) as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			if (resource === 'channel') {
				//https://developers.google.com/youtube/v3/docs/channels/list
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const part = this.getNodeParameter('part', i) as string[];
					const options = this.getNodeParameter('options', i) as IDataObject;

					qs.part = part.join(',');

					if (options.categoryId) {
						qs.categoryId = options.categoryId as string;
					}
					if (options.forUsername) {
						qs.forUsername = options.forUsername as string;
					}
					if (options.id) {
						qs.id = options.id as string;
					}
					if (options.managedByMe) {
						qs.managedByMe = options.managedByMe as boolean;
					}
					if (options.mine) {
						qs.mine = options.mine as boolean;
					}
					if (options.h1) {
						qs.h1 = options.h1 as string;
					}
					if (options.onBehalfOfContentOwner) {
						qs.onBehalfOfContentOwner = options.onBehalfOfContentOwner as string;
					}
					if (returnAll) {
						responseData = await googleApiRequestAllItems.call(
							this,
							'items',
							'GET',
							`/youtube/v3/channels`,
							{},
							qs
						);
					} else {
						qs.maxResults = this.getNodeParameter('limit', i) as number;
						responseData = await googleApiRequest.call(
							this,
							'GET',
							`/youtube/v3/channels`,
							{},
							qs
						);
						responseData = responseData.items;
					}
				}
				//https://developers.google.com/youtube/v3/docs/channels/update
				if (operation === 'update') {
					const channelId = this.getNodeParameter('channelId', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

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
						const channelSettingsValues = (updateFields.brandingSettingsUi as IDataObject).channelSettingsValues as IDataObject | undefined;
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
								channelSettings.featuredChannelsTitle = channelSettingsOptions.featuredChannelsTitle;
							}
							if (channelSettingsOptions.featuredChannelsUrls) {
								channelSettings.featuredChannelsUrls = channelSettingsOptions.featuredChannelsUrls;
							}
							if (channelSettingsOptions.keywords) {
								channelSettings.keywords = channelSettingsOptions.keywords;
							}
							if (channelSettingsOptions.moderateComments) {
								channelSettings.moderateComments = channelSettingsOptions.moderateComments as boolean;
							}
							if (channelSettingsOptions.profileColor) {
								channelSettings.profileColor = channelSettingsOptions.profileColor as string;
							}
							if (channelSettingsOptions.profileColor) {
								channelSettings.profileColor = channelSettingsOptions.profileColor as string;
							}
							if (channelSettingsOptions.showRelatedChannels) {
								channelSettings.showRelatedChannels = channelSettingsOptions.showRelatedChannels as boolean;
							}
							if (channelSettingsOptions.showBrowseView) {
								channelSettings.showBrowseView = channelSettingsOptions.showBrowseView as boolean;
							}
							if (channelSettingsOptions.trackingAnalyticsAccountId) {
								channelSettings.trackingAnalyticsAccountId = channelSettingsOptions.trackingAnalyticsAccountId as string;
							}
							if (channelSettingsOptions.unsubscribedTrailer) {
								channelSettings.unsubscribedTrailer = channelSettingsOptions.unsubscribedTrailer as string;
							}
						}

						const imageSettingsValues = (updateFields.brandingSettingsUi as IDataObject).imageSettingsValues as IDataObject | undefined;
						const imageSettings: IDataObject = {};
						if (imageSettingsValues?.image) {
							const imageSettingsOptions = imageSettings.image as IDataObject;
							if (imageSettingsOptions.bannerExternalUrl) {
								imageSettings.bannerExternalUrl = imageSettingsOptions.bannerExternalUrl as string
							}
							if (imageSettingsOptions.trackingImageUrl) {
								imageSettings.trackingImageUrl = imageSettingsOptions.trackingImageUrl as string
							}
							if (imageSettingsOptions.watchIconImageUrl) {
								imageSettings.watchIconImageUrl = imageSettingsOptions.watchIconImageUrl as string
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
						qs
					);
				}
				//https://developers.google.com/youtube/v3/docs/channelBanners/insert
				if (operation === 'uploadBanner') {
					const channelId = this.getNodeParameter('channelId', i) as string;
					const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;

					let mimeType;

					// Is binary file to upload
					const item = items[i];

					if (item.binary === undefined) {
						throw new Error('No binary data exists on item!');
					}

					if (item.binary[binaryProperty] === undefined) {
						throw new Error(`No binary data property "${binaryProperty}" does not exists on item!`);
					}

					if (item.binary[binaryProperty].mimeType) {
						mimeType = item.binary[binaryProperty].mimeType;
					}

					const body = Buffer.from(item.binary[binaryProperty].data, BINARY_ENCODING);

					const requestOptions = {
						headers: {
							'Content-Type': mimeType,
						},
						json: false,
					};

					let response = await googleApiRequest.call(this, 'POST', '/upload/youtube/v3/channelBanners/insert', body, qs, undefined, requestOptions);

					const { url } = JSON.parse(response);

					qs.part = 'brandingSettings'

					responseData = await googleApiRequest.call(
						this,
						'PUT',
						`/youtube/v3/channels`,
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
		}
		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else if (responseData !== undefined) {
			returnData.push(responseData as IDataObject);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
