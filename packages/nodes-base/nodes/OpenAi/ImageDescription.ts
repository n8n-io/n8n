import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const imageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an Image',
				description: 'Create an image for a given text',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/images/generations',
					},
				},
			},
		],
		routing: {
			output: {
				postReceive: [
					{
						type: 'rootProperty',
						properties: {
							property: 'data',
						},
					},
				],
			},
		},
		default: 'create',
	},
];

const createOperations: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		placeholder: 'e.g. A cute cat eating a dinosaur',
		description:
			'A text description of the desired image(s). The maximum length is 1000 characters.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			send: {
				type: 'body',
				property: 'prompt',
			},
		},
	},
	{
		displayName: 'Response Format',
		name: 'responseFormat',
		type: 'options',
		default: 'binaryData',
		description: 'The format in which to return the image(s)',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		options: [
			{
				name: 'Binary Data',
				value: 'binaryData',
			},
			{
				name: 'Image Url',
				value: 'imageUrl',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'response_format',
				value: '={{ $value === "imageUrl" ? "url" : "b64_json" }}',
			},
			output: {
				postReceive: [
					async function (items: INodeExecutionData[]): Promise<INodeExecutionData[]> {
						if (this.getNode().parameters.responseFormat === 'imageUrl') {
							return items;
						}

						const result: INodeExecutionData[] = [];
						for (let i = 0; i < items.length; i++) {
							result.push({
								json: {},
								binary: {
									data: await this.helpers.prepareBinaryData(
										Buffer.from(items[i].json.b64_json as string, 'base64'),
										'data',
									),
								},
							} as INodeExecutionData);
						}

						return result;
					},
				],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		placeholder: 'Add Option',
		description: 'Additional options to add',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Number of Images',
				name: 'n',
				default: 1,
				description: 'Number of images to generate',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				routing: {
					send: {
						type: 'body',
						property: 'n',
					},
				},
			},
			{
				displayName: 'Resolution',
				name: 'size',
				type: 'options',
				options: [
					{
						name: '256x256',
						value: '256x256',
					},
					{
						name: '512x512',
						value: '512x512',
					},
					{
						name: '1024x1024',
						value: '1024x1024',
					},
				],
				routing: {
					send: {
						type: 'body',
						property: 'size',
					},
				},
				default: '1024x1024',
			},
		],
	},
];

export const imageFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                image:create                                */
	/* -------------------------------------------------------------------------- */
	...createOperations,
];
