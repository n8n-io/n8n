import type { INodeProperties } from 'n8n-workflow';

const nameValueCollection = (
	displayName: string,
	name: string,
	placeholder: string,
): INodeProperties => ({
	displayName,
	name,
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder,
	default: {},
	options: [
		{
			name: 'parameters',
			displayName: 'Parameter',
			values: [
				{ displayName: 'Name', name: 'name', type: 'string', default: '' },
				{ displayName: 'Value', name: 'value', type: 'string', default: '' },
			],
		},
	],
});

export const GENERIC_AUTH_TYPES = [
	'httpBasicAuth',
	'httpBearerAuth',
	'httpHeaderAuth',
	'httpQueryAuth',
] as const;

const showForRequest = (property: INodeProperties): INodeProperties => ({
	...property,
	displayOptions: {
		...property.displayOptions,
		show: { ...property.displayOptions?.show, source: ['request'] },
	},
});

export const sourceProperties: INodeProperties[] = [
	{
		displayName: 'Source',
		name: 'source',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'HTTP Request',
				value: 'request',
				description: 'The trigger sends the request it is configured with',
			},
			{
				name: 'Connected Tool',
				value: 'tool',
				description: 'The trigger calls the tool connected to the Source input for each page',
			},
		],
		default: 'request',
	},
	{
		displayName:
			"Connect any tool node or a Call n8n Workflow Tool to the Source input. Its output is $response.body. To page through results, use {{ $page.offset }}, {{ $page.number }}, {{ $page.size }}, {{ $page.cursor }} (the cursor or the next URL) and {{ $cursor.since }} in its fields. {{ $fromAI('page_cursor') }} and the like also work. For HTTP Request, turn on Include Response Headers and Status to read $response.headers.",
		name: 'toolNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { source: ['tool'] } },
	},
];

const baseRequestProperties: INodeProperties[] = [
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		options: [
			{ name: 'GET', value: 'GET' },
			{ name: 'POST', value: 'POST' },
		],
		default: 'GET',
		description: 'The request method to use',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. https://api.example.com/v1/orders?sort=-created_at',
		description: 'The URL to poll',
	},
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		noDataExpression: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{ name: 'None', value: 'none' },
			{ name: 'Generic Credential Type', value: 'genericCredentialType' },
		],
		default: 'none',
	},
	{
		displayName: 'Generic Auth Type',
		name: 'genericAuthType',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Basic Auth', value: 'httpBasicAuth' },
			{ name: 'Bearer Auth', value: 'httpBearerAuth' },
			{ name: 'Header Auth', value: 'httpHeaderAuth' },
			{ name: 'Query Auth', value: 'httpQueryAuth' },
		],
		default: 'httpHeaderAuth',
		displayOptions: { show: { authentication: ['genericCredentialType'] } },
	},
	nameValueCollection('Query Parameters', 'queryParameters', 'Add Query Parameter'),
	nameValueCollection('Headers', 'headerParameters', 'Add Header'),
	{
		displayName: 'JSON Body',
		name: 'jsonBody',
		type: 'json',
		default: '',
		displayOptions: { show: { method: ['POST'] } },
		description:
			'The JSON body to send, for search endpoints that take the sort and filter in the body',
	},
];

export const requestProperties = baseRequestProperties.map(showForRequest);

export const detectionProperties: INodeProperties[] = [
	{
		displayName: 'Items',
		name: 'items',
		type: 'string',
		default: '={{ $response.body }}',
		required: true,
		placeholder: 'e.g. {{ $response.body.data }}',
		description: 'The array of records in the response',
	},
	{
		displayName: 'Item Key',
		name: 'itemKey',
		type: 'string',
		default: '={{ $json.id }}',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'e.g. {{ $json.id }}',
		description: 'The value that identifies a record',
	},
	{
		displayName: 'API Style',
		name: 'apiStyle',
		type: 'options',
		noDataExpression: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Latest Items',
				value: 'latest',
				description:
					'Reads the first pages and emits the records it has not seen. Not exact on large bursts.',
			},
			{
				name: 'Newest First, by Date',
				value: 'newestFirstDate',
				description: 'The API returns the newest records first, sorted by a date',
			},
			{
				name: 'Newest First, by ID',
				value: 'newestFirstId',
				description: 'The API returns the newest records first, sorted by a numeric ID',
			},
			{
				name: 'Oldest First, Filtered by Date',
				value: 'oldestFirstSince',
				description: 'The API returns the oldest records first and accepts a "since" filter',
			},
			{
				name: 'Oldest First, by Date',
				value: 'oldestFirstDate',
				description: 'The API returns the oldest records first, sorted by a date',
			},
			{
				name: 'Oldest First, by ID',
				value: 'oldestFirstId',
				description: 'The API returns the oldest records first, sorted by a numeric ID',
			},
		],
		default: 'latest',
	},
	{
		displayName: 'Item Date',
		name: 'sortDate',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. {{ $json.created_at }}',
		description:
			'The date the list is sorted by: an ISO string, a Luxon DateTime or epoch milliseconds',
		displayOptions: {
			show: { apiStyle: ['newestFirstDate', 'oldestFirstSince', 'oldestFirstDate'] },
		},
	},
	{
		displayName: 'Item ID',
		name: 'sortId',
		type: 'string',
		default: '',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'e.g. {{ $json.id }}',
		description: 'The numeric ID the list is sorted by',
		displayOptions: { show: { apiStyle: ['newestFirstId', 'oldestFirstId'] } },
	},
	{
		displayName:
			'Put {{ $cursor.since }} in the query or the body, for example created_after={{ $cursor.since }}',
		name: 'sinceNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { apiStyle: ['oldestFirstSince'], source: ['request'] } },
	},
	{
		displayName: 'Pagination',
		name: 'pagination',
		type: 'options',
		noDataExpression: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{ name: 'None', value: 'none' },
			{
				name: 'Cursor',
				value: 'cursor',
				description: 'The request uses {{ $page.cursor }}',
			},
			{
				name: 'Offset',
				value: 'offset',
				description: 'The request uses {{ $page.offset }} and {{ $page.size }}',
			},
			{
				name: 'Page Number',
				value: 'pageNumber',
				description: 'The request uses {{ $page.number }} and {{ $page.size }}',
			},
			{
				name: 'Next URL',
				value: 'nextUrl',
				description: 'The response gives the URL of the next page',
			},
		],
		default: 'none',
	},
	{
		displayName: 'Next Cursor',
		name: 'nextCursor',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. {{ $response.body.next_cursor }}',
		displayOptions: { show: { pagination: ['cursor'] } },
	},
	{
		displayName: 'First Page',
		name: 'firstPage',
		type: 'number',
		default: 1,
		displayOptions: { show: { pagination: ['pageNumber'] } },
	},
	{
		displayName: 'Next URL',
		name: 'nextUrl',
		type: 'string',
		default: '',
		placeholder: 'e.g. {{ $response.body.links.next }}',
		description: 'Leave empty to use the Link header with rel="next"',
		displayOptions: { show: { pagination: ['nextUrl'] } },
	},
	{
		displayName: 'Has More',
		name: 'hasMore',
		type: 'string',
		default: '',
		placeholder: 'e.g. {{ $response.body.has_more }}',
		description:
			'Whether another page follows. Leave empty to continue while the next cursor is set or the page is not empty.',
		displayOptions: { show: { pagination: ['cursor', 'offset', 'pageNumber'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'The value of {{ $page.size }}',
			},
			{
				displayName: 'Max Pages',
				name: 'maxPages',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 5,
				description: 'The most pages one poll reads',
			},
			{
				displayName: 'Max Items',
				name: 'maxItems',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 500,
				description: 'The most items one poll emits',
			},
			{
				displayName: 'Clock Skew Margin (Minutes)',
				name: 'skewMinutes',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 5,
				description: 'How far behind the newest date the trigger looks again for late records',
			},
		],
	},
];
