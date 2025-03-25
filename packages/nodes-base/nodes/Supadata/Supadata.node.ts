import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	supadataApiRequest,
	extractVideoIdFromUrl,
	extractChannelIdFromUrl,
} from './GenericFunctions';

export class Supadata implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supadata',
		name: 'supadata',
		icon: 'file:Supadata.svg',
		group: ['input'],
		version: 1,
		description: 'Access Supadata API to fetch YouTube and web data',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Supadata',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'supadataApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------------------------------------
			//         Resource to Operate on
			// ----------------------------------------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'YouTube', value: 'youtube' },
					{ name: 'Web', value: 'webScrape' },
				],
				default: 'youtube',
			},

			// --------------------------------------------------------------------------------------------------------
			//         YouTube Operations
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['youtube'],
					},
				},
				options: [
					{
						name: 'Get Video',
						value: 'getVideo',
						description: 'Get details of a YouTube video',
						action: 'Get video details',
					},
					{
						name: 'Get Transcript',
						value: 'getTranscript',
						description: 'Get the transcript of a YouTube video',
						action: 'Get video transcript',
					},
					{
						name: 'Get Channel',
						value: 'getChannel',
						description: 'Get details of a YouTube channel',
						action: 'Get channel details',
					},
					{
						name: 'Get Channel Videos',
						value: 'getChannelVideos',
						description: 'Get videos of a YouTube channel',
						action: 'Get channel videos',
					},
				],
				default: 'getVideo',
			},

			// YouTube Video Fields
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{
						name: 'Video ID',
						value: 'videoId',
					},
					{
						name: 'Video URL',
						value: 'videoUrl',
					},
				],
				default: 'videoId',
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getVideo', 'getTranscript'],
					},
				},
			},
			{
				displayName: 'Video ID',
				name: 'videoId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getVideo', 'getTranscript'],
						inputType: ['videoId'],
					},
				},
				placeholder: 'dQw4w9WgXcQ',
				description: 'The ID of the YouTube video',
			},
			{
				displayName: 'Video URL',
				name: 'videoUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getVideo', 'getTranscript'],
						inputType: ['videoUrl'],
					},
				},
				placeholder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
				description: 'The URL of the YouTube video',
			},
			{
				displayName: 'Return as Plain Text',
				name: 'text',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getTranscript'],
					},
				},
				description: 'Whether to return the transcript as plain text',
			},

			// YouTube Channel Fields
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{
						name: 'Channel ID',
						value: 'channelId',
					},
					{
						name: 'Channel URL',
						value: 'channelUrl',
					},
				],
				default: 'channelId',
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getChannel'],
					},
				},
			},
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getChannel'],
						inputType: ['channelId'],
					},
				},
				placeholder: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
				description: 'The ID of the YouTube channel',
			},
			{
				displayName: 'Channel URL',
				name: 'channelUrl',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getChannel'],
						inputType: ['channelUrl'],
					},
				},
				placeholder: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw',
				description: 'The URL of the YouTube channel',
			},
			{
				displayName: 'Channel ID',
				name: 'channelId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getChannelVideos'],
					},
				},
				placeholder: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
				description: 'The ID of the YouTube channel',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getChannelVideos'],
					},
				},
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				displayOptions: {
					show: {
						resource: ['youtube'],
						operation: ['getChannelVideos'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 5000,
				},
				description: 'Max number of results to return',
			},

			// --------------------------------------------------------------------------------------------------------
			//         Web Scrape Operations
			// --------------------------------------------------------------------------------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['webScrape'],
					},
				},
				options: [
					{
						name: 'Scrape URL',
						value: 'scrapeUrl',
						description: 'Scrape data from a URL',
						action: 'Scrape data from a URL',
					},
				],
				default: 'scrapeUrl',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['webScrape'],
						operation: ['scrapeUrl'],
					},
				},
				placeholder: 'https://example.com',
				description: 'The URL to scrape',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let responseData;

				if (resource === 'youtube') {
					if (operation === 'getVideo') {
						const inputType = this.getNodeParameter('inputType', i) as string;
						const videoIdentifier =
							inputType === 'videoId'
								? (this.getNodeParameter('videoId', i) as string)
								: extractVideoIdFromUrl(
										this.getNodeParameter('videoUrl', i) as string,
										this.getNode(),
									);

						responseData = await supadataApiRequest.call(
							this,
							'GET' as IHttpRequestMethods,
							'/youtube/video',
							{},
							{ id: videoIdentifier },
						);
					} else if (operation === 'getTranscript') {
						const inputType = this.getNodeParameter('inputType', i) as string;
						const videoIdentifier =
							inputType === 'videoId'
								? (this.getNodeParameter('videoId', i) as string)
								: extractVideoIdFromUrl(
										this.getNodeParameter('videoUrl', i) as string,
										this.getNode(),
									);
						const text = this.getNodeParameter('text', i) as boolean;

						responseData = await supadataApiRequest.call(
							this,
							'GET' as IHttpRequestMethods,
							'/youtube/transcript',
							{},
							{ id: videoIdentifier, text },
						);
					} else if (operation === 'getChannel') {
						const inputType = this.getNodeParameter('inputType', i) as string;
						const channelIdentifier =
							inputType === 'channelId'
								? (this.getNodeParameter('channelId', i) as string)
								: extractChannelIdFromUrl(
										this.getNodeParameter('channelUrl', i) as string,
										this.getNode(),
									);

						responseData = await supadataApiRequest.call(
							this,
							'GET' as IHttpRequestMethods,
							'/youtube/channel',
							{},
							{ id: channelIdentifier },
						);
					} else if (operation === 'getChannelVideos') {
						const channelId = this.getNodeParameter('channelId', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const qs: IDataObject = { id: channelId };

						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i) as number;
						}

						responseData = await supadataApiRequest.call(
							this,
							'GET' as IHttpRequestMethods,
							'/youtube/channel/videos',
							{},
							qs,
						);
						responseData = responseData.videoIds;
					}
				} else if (resource === 'webScrape') {
					if (operation === 'scrapeUrl') {
						const url = this.getNodeParameter('url', i) as string;
						responseData = await supadataApiRequest.call(
							this,
							'GET' as IHttpRequestMethods,
							'/web/scrape',
							{},
							{ url },
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
