import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import FormData from 'form-data';

import { getCursorPaginator, gongApiPaginateRequest } from '../GenericFunctions';

export const callOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['call'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add new call',
				routing: {
					request: {
						method: 'POST',
						url: '/v2/calls',
					},
				},
				action: 'Create call',
			},
			{
				name: 'Create Media',
				value: 'createMedia',
				description: 'Adds a call media',
				action: 'Add call media',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data for a specific call',
				routing: {
					request: {
						method: 'POST',
						url: '/v2/calls/extensive',
					},
				},
				action: 'Get call',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List calls that took place during a specified date range',
				routing: {
					request: {
						method: 'POST',
						url: '/v2/calls/extensive',
						body: {
							filter: {},
						},
					},
				},
				action: 'Get many calls',
			},
		],
		default: 'getAll',
	},
];

const createFields: INodeProperties[] = [
	{
		displayName: 'Actual Start',
		name: 'actualStart',
		default: '',
		description:
			"The actual date and time when the call started in the ISO-8601 format (e.g., '2018-02-18T02:30:00-07:00' or '2018-02-18T08:00:00Z', where Z stands for UTC);",
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['create'],
			},
		},
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'actualStart',
				value: '={{ new Date($value).toISOString() }}',
			},
		},
		type: 'dateTime',
	},
	{
		displayName: 'Client Unique ID',
		name: 'clientUniqueId',
		default: '',
		description:
			"A call's unique identifier in the PBX or the recording system. Gong uses this identifier to prevent repeated attempts to upload the same recording.",
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['create'],
			},
		},
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'clientUniqueId',
				value: '={{ $value }}',
			},
		},
		type: 'string',
	},
	{
		displayName: 'Direction',
		name: 'direction',
		default: 'Inbound',
		description:
			'Whether the call is inbound (someone called the company), outbound (a rep dialed someone outside the company), or a conference call',
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Inbound',
				value: 'Inbound',
			},
			{
				name: 'Outbound',
				value: 'Outbound',
			},
			{
				name: 'Conference',
				value: 'Conference',
			},
			{
				name: 'Unknown',
				value: 'Unknown',
			},
		],
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'direction',
				value: '={{ $value }}',
			},
		},
		type: 'options',
	},
	{
		displayName: 'Parties',
		name: 'parties',
		default: [],
		description: "A list of the call's participants. A party must be provided for the primaryUser.",
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Party Fields',
				name: 'partyFields',
				values: [
					// Fields not included: context
					{
						displayName: 'Phone Number',
						name: 'phoneNumber',
						default: '',
						description: 'The phone number of the party, if available',
						routing: {
							send: {
								type: 'body',
								property: '=parties[{{$index}}].phoneNumber',
								value: '={{ $value }}',
							},
						},
						type: 'string',
					},
					{
						displayName: 'Email Address',
						name: 'emailAddress',
						default: '',
						description: 'The email address of the party, if available',
						routing: {
							send: {
								type: 'body',
								property: '=parties[{{$index}}].emailAddress',
								value: '={{ $value || null }}',
							},
						},
						type: 'string',
					},
					{
						displayName: 'Name',
						name: 'name',
						default: '',
						description: 'The name of the party, if available',
						routing: {
							send: {
								type: 'body',
								property: '=parties[{{$index}}].name',
								value: '={{ $value }}',
							},
						},
						type: 'string',
					},
					{
						displayName: 'Party ID',
						name: 'partyId',
						default: '',
						description:
							'An identifier that is only required when speakersTimeline is provided. The partyId is used to recognize the speakers within the provided speakersTimeline.',
						routing: {
							send: {
								type: 'body',
								property: '=parties[{{$index}}].partyId',
								value: '={{ $value }}',
							},
						},
						type: 'string',
					},
					{
						displayName: 'Media Channel ID',
						name: 'mediaChannelId',
						default: 0,
						description:
							'The audio channel corresponding to the company team member (rep) used when the uploaded media file is multi-channel (stereo). The channel ID is either 0 or 1 (representing left or right respectively).',
						options: [
							{
								name: 'Left',
								value: 0,
							},
							{
								name: 'Right',
								value: 1,
							},
						],
						routing: {
							send: {
								type: 'body',
								property: '=parties[{{$index}}].mediaChannelId',
								value: '={{ $value }}',
							},
						},
						type: 'options',
					},
					{
						displayName: 'User ID',
						name: 'userId',
						default: '',
						description:
							'The user ID of the participant within the Gong system, if the participant is a user',
						routing: {
							send: {
								type: 'body',
								property: '=parties[{{$index}}].userId',
								value: '={{ $value }}',
							},
						},
						type: 'string',
					},
				],
			},
		],
		required: true,
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
	},
	{
		displayName: 'Primary User',
		name: 'primaryUser',
		default: '',
		description: 'The Gong internal user ID of the team member who hosted the call',
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['create'],
			},
		},
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'primaryUser',
				value: '={{ $value }}',
			},
		},
		type: 'string',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['create'],
			},
		},
		options: [
			// Fields not included: context, speakersTimeline
			{
				displayName: 'Call Provider Code',
				name: 'callProviderCode',
				default: '',
				description:
					'The code identifies the provider conferencing or telephony system. For example: zoom, clearslide, gotomeeting, ringcentral, outreach, insidesales, etc. These values are predefined by Gong, please contact help@gong.io to find the proper value for your system.',
				routing: {
					send: {
						type: 'body',
						property: 'callProviderCode',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Custom Data',
				name: 'customData',
				default: '',
				description:
					'Optional metadata associated with the call (represented as text). Gong stores this metadata and it can be used for troubleshooting.',
				routing: {
					send: {
						type: 'body',
						property: 'customData',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Disposition',
				name: 'disposition',
				default: '',
				description:
					'The disposition of the call. The disposition is free text of up to 255 characters.',
				routing: {
					send: {
						type: 'body',
						property: 'disposition',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Download Media Url',
				name: 'downloadMediaUrl',
				default: '',
				description:
					"The URL from which Gong can download the media file.The URL must be unique, the audio or video file must be a maximum of 1.5GB.If you provide this URL, you should not perform the 'Add call media' step",
				routing: {
					send: {
						type: 'body',
						property: 'downloadMediaUrl',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Duration',
				name: 'duration',
				default: 0,
				description: 'The actual call duration in seconds',
				routing: {
					send: {
						type: 'body',
						property: 'duration',
						value: '={{ $value }}',
					},
				},
				type: 'number',
			},
			{
				displayName: 'Language Code',
				name: 'languageCode',
				default: '',
				description:
					'The language code the call should be transcribed to.This field is optional as Gong automatically detects the language spoken in the call and transcribes it accordingly. Set this field only if you are sure of the language the call is in.',
				routing: {
					send: {
						type: 'body',
						property: 'languageCode',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Meeting URL',
				name: 'meetingUrl',
				default: '',
				description: 'The URL of the conference call by which users join the meeting',
				routing: {
					send: {
						type: 'body',
						property: 'meetingUrl',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Purpose',
				name: 'purpose',
				default: '',
				description:
					'The purpose of the call. This optional field is a free text of up to 255 characters.',
				routing: {
					send: {
						type: 'body',
						property: 'purpose',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Scheduled End',
				name: 'scheduledEnd',
				default: '',
				description:
					"The date and time the call was scheduled to end in the ISO-8601 format (e.g., '2018-02-18T02:30:00-07:00' or '2018-02-18T08:00:00Z', where Z stands for UTC);",
				routing: {
					send: {
						type: 'body',
						property: 'scheduledEnd',
						value: '={{ new Date($value).toISOString() }}',
					},
				},
				type: 'dateTime',
			},
			{
				displayName: 'Scheduled Start',
				name: 'scheduledStart',
				default: '',
				description:
					"The date and time the call was scheduled to begin in the ISO-8601 format (e.g., '2018-02-18T02:30:00-07:00' or '2018-02-18T08:00:00Z', where Z stands for UTC);",
				routing: {
					send: {
						type: 'body',
						property: 'scheduledStart',
						value: '={{ new Date($value).toISOString() }}',
					},
				},
				type: 'dateTime',
			},
			{
				displayName: 'Title',
				name: 'title',
				default: '',
				description:
					'The title of the call. This title is available in the Gong system for indexing and search.',
				routing: {
					send: {
						type: 'body',
						property: 'title',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				default: '',
				description:
					'Optional workspace identifier. If specified, the call will be placed into this workspace, otherwise, the default algorithm for workspace placement will be applied.',
				routing: {
					send: {
						type: 'body',
						property: 'workspaceId',
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
		],
		placeholder: 'Add Field',
		type: 'collection',
	},
];

const createMediaFields: INodeProperties[] = [
	{
		displayName: 'Call to Get',
		name: 'call',
		default: {
			mode: 'id',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['createMedia'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getCalls',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]{1,20}',
							errorMessage: 'Not a valid Gong Call ID',
						},
					},
				],
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://subdomain.app.gong.io/call?id=123456789',
				extractValue: {
					type: 'regex',
					regex: 'https:\\/\\/[a-zA-Z0-9-]+\\.app\\.gong\\.io\\/call\\?id=([0-9]{1,20})',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'https:\\/\\/[a-zA-Z0-9-]+\\.app\\.gong\\.io\\/call\\?id=([0-9]{1,20})',
							errorMessage: 'Not a valid Gong URL',
						},
					},
				],
			},
		],
		required: true,
		routing: {
			request: {
				method: 'PUT',
				url: '=/v2/calls/{{$value}}/media',
			},
		},
		type: 'resourceLocator',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		default: '',
		description: 'The name of the incoming field containing the binary file data to be processed',
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['createMedia'],
			},
		},
		required: true,
		routing: {
			send: {
				preSend: [
					async function (this: IExecuteSingleFunctions, requestOptions: IHttpRequestOptions) {
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName') as string;
						const binaryData = this.helpers.assertBinaryData(binaryPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(binaryPropertyName);

						const formData = new FormData();
						formData.append('mediaFile', binaryDataBuffer, {
							filename: binaryData.fileName,
							contentType: binaryData.mimeType,
						});
						requestOptions.body = formData;

						return requestOptions;
					},
				],
			},
		},
		type: 'string',
	},
];

const getFields: INodeProperties[] = [
	{
		displayName: 'Call to Get',
		name: 'call',
		default: {
			mode: 'id',
			value: '',
		},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['get'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getCalls',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '[0-9]{1,20}',
							errorMessage: 'Not a valid Gong Call ID',
						},
					},
				],
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'https://subdomain.app.gong.io/call?id=123456789',
				extractValue: {
					type: 'regex',
					regex: 'https:\\/\\/[a-zA-Z0-9-]+\\.app\\.gong\\.io\\/call\\?id=([0-9]{1,20})',
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'https:\\/\\/[a-zA-Z0-9-]+\\.app\\.gong\\.io\\/call\\?id=([0-9]{1,20})',
							errorMessage: 'Not a valid Gong URL',
						},
					},
				],
			},
		],
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'filter.callIds',
				propertyInDotNotation: true,
				value: '={{ [$value] }}',
			},
			output: {
				postReceive: [
					{
						type: 'rootProperty',
						properties: {
							property: 'calls',
						},
					},
				],
			},
		},
		type: 'resourceLocator',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['get'],
			},
		},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'Action Items',
				name: 'pointsOfInterest',
				default: false,
				description: 'Whether to add call points of interest',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.pointsOfInterest',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Audio and Video URLs',
				name: 'media',
				default: false,
				description:
					'Whether to add audio and video URL of the call. The URLs will be available for 8 hours.',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.media',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Brief',
				name: 'brief',
				default: false,
				description: 'Whether to add the spotlight call brief',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.brief',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Comments',
				name: 'publicComments',
				default: false,
				description: 'Whether to add public comments made for this call',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.collaboration.publicComments',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Highlights',
				name: 'highlights',
				default: false,
				description: 'Whether to add the call highlights',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.highlights',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Keypoints',
				name: 'keyPoints',
				default: false,
				description: 'Whether to add the key points of the call',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.keyPoints',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Outline',
				name: 'outline',
				default: false,
				description: 'Whether to add the call outline',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.outline',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Outcome',
				name: 'callOutcome',
				default: false,
				description: 'Whether to add the outcome of the call',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.callOutcome',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Participants',
				name: 'parties',
				default: false,
				description: 'Whether to add information about the parties of the call',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.parties',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Structure',
				name: 'structure',
				default: false,
				description: 'Whether to add the call agenda',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.structure',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Trackers',
				name: 'Trackers',
				default: false,
				description:
					'Whether to add the smart tracker and keyword tracker information for the call',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.trackers',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Transcript',
				name: 'transcript',
				default: false,
				description: 'Whether to add information about the participants',
				routing: {
					output: {
						postReceive: [
							async function (
								this: IExecuteSingleFunctions,
								items: INodeExecutionData[],
								_responseData: IN8nHttpFullResponse,
							): Promise<INodeExecutionData[]> {
								for (const item of items) {
									const callTranscripts = await gongApiPaginateRequest.call(
										this,
										'POST',
										'/v2/calls/transcript',
										{ filter: { callIds: [(item.json.metaData as IDataObject).id] } },
										{},
										item.index ?? 0,
										'callTranscripts',
									);
									item.json.transcript = callTranscripts?.length
										? callTranscripts[0].transcript
										: [];
								}
								return items;
							},
						],
					},
				},
				type: 'boolean',
			},
			{
				displayName: 'Topics',
				name: 'topics',
				default: false,
				description: 'Whether to add the duration of call topics',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.content.topics',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
		],
		type: 'collection',
	},
];

const getAllFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['getAll'],
			},
		},
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: getCursorPaginator('calls'),
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		routing: {
			output: {
				postReceive: [
					{
						type: 'rootProperty',
						properties: {
							property: 'calls',
						},
					},
					{
						type: 'limit',
						properties: {
							maxResults: '={{ $value }}',
						},
					},
				],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['getAll'],
			},
		},
		placeholder: 'Add Filter',
		options: [
			{
				displayName: 'From',
				name: 'fromDateTime',
				default: '',
				description:
					"Date and time (in ISO-8601 format: '2018-02-18T02:30:00-07:00' or '2018-02-18T08:00:00Z', where Z stands for UTC) from which to list recorded calls. Returns calls that started on or after the specified date and time. If not provided, list starts with earliest call. For web-conference calls recorded by Gong, the date denotes its scheduled time, otherwise, it denotes its actual start time.",
				routing: {
					send: {
						type: 'body',
						property: 'filter.fromDateTime',
						propertyInDotNotation: true,
						value: '={{ new Date($value).toISOString() }}',
						preSend: [
							async function (
								this: IExecuteSingleFunctions,
								requestOptions: IHttpRequestOptions,
							): Promise<IHttpRequestOptions> {
								return requestOptions;
							},
						],
					},
				},

				type: 'dateTime',
			},
			{
				displayName: 'To',
				name: 'toDateTime',
				default: '',
				description:
					"Date and time (in ISO-8601 format: '2018-02-18T02:30:00-07:00' or '2018-02-18T08:00:00Z', where Z stands for UTC) until which to list recorded calls. Returns calls that started up to but excluding specified date and time. If not provided, list ends with most recent call. For web-conference calls recorded by Gong, the date denotes its scheduled time, otherwise, it denotes its actual start time.",
				routing: {
					send: {
						type: 'body',
						property: 'filter.toDateTime',
						propertyInDotNotation: true,
						value: '={{ new Date($value).toISOString() }}',
					},
				},
				type: 'dateTime',
			},
			{
				displayName: 'Workspace ID',
				name: 'workspaceId',
				default: '',
				description: 'Return only the calls belonging to this workspace',
				routing: {
					send: {
						type: 'body',
						property: 'filter.workspaceId',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'Call IDs',
				name: 'callIds',
				default: '',
				description: 'List of calls IDs to be filtered',
				hint: 'Comma separated list of IDs, array of strings can be set in expression',
				routing: {
					send: {
						type: 'body',
						property: 'filter.callIds',
						propertyInDotNotation: true,
						value:
							'={{ Array.isArray($value) ? $value.map(x => x.toString()) : $value.split(",").map(x => x.trim()) }}',
					},
				},
				type: 'string',
			},
			{
				displayName: 'User IDs',
				name: 'primaryUserIds',
				default: '',
				description: 'Return only the calls hosted by the specified users',
				hint: 'Comma separated list of IDs, array of strings can be set in expression',
				routing: {
					send: {
						type: 'body',
						property: 'filter.primaryUserIds',
						propertyInDotNotation: true,
						value:
							'={{ Array.isArray($value) ? $value.map(x => x.toString()) : $value.split(",").map(x => x.trim()) }}',
					},
				},
				type: 'string',
			},
		],
		type: 'collection',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		displayOptions: {
			show: {
				resource: ['call'],
				operation: ['getAll'],
			},
		},
		placeholder: 'Add option',
		options: [
			{
				displayName: 'Participants',
				name: 'parties',
				default: false,
				description: 'Whether to add information about the parties of the call',
				routing: {
					send: {
						type: 'body',
						property: 'contentSelector.exposedFields.parties',
						propertyInDotNotation: true,
						value: '={{ $value }}',
					},
				},
				type: 'boolean',
			},
		],
		type: 'collection',
	},
];

export const callFields: INodeProperties[] = [
	...createFields,
	...createMediaFields,
	...getFields,
	...getAllFields,
];
