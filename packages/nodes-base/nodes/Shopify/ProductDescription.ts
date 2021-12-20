import {
	INodeProperties,
} from 'n8n-workflow';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a product',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const productFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                product:create/update                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		placeholder: '',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'product',
				],
			},
		},
		default: '',
		description: 'The name of the product.',
		required: true,
	},
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'product',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Body HTML',
				name: 'body_html',
				type: 'string',
				default: '',
				description: 'A description of the product. Supports HTML formatting.',
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: `A unique human-friendly string for the product. Automatically generated from the product's title. Used by the Liquid templating language to refer to objects.`,
			},
			{
				displayName: 'Images',
				name: 'images',
				type: 'collection',
				placeholder: 'Add Image Field',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'A list of product image objects, each one representing an image associated with the product.',
				options: [
					{
						displayName: 'Created At',
						name: 'created_at',
						type: 'dateTime',
						default: '',
						description: 'The date and time when the product image was created.',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: '',
						description: 'A unique numeric identifier for the product image.',
					},
					{
						displayName: 'Position',
						name: 'position',
						type: 'number',
						default: '',
						description: `The order of the product image in the list. The first product image is at position 1 and is the "main" image for the product.`,
					},
					{
						displayName: 'Product ID',
						name: 'product_id',
						type: 'number',
						default: '',
						description: 'The id of the product associated with the image.',
					},
					{
						displayName: 'Variant IDs',
						name: 'variant_ids',
						type: 'number',
						typeOptions: {
							multipleValues: true,
						},
						default: '',
						description: 'An array of variant ids associated with the image.',
					},
					{
						displayName: 'Source',
						name: 'src',
						type: 'string',
						default: '',
						description: `<p>Specifies the location of the product image. This parameter supports URL filters that you can use to retrieve modified copies of the image.</p><p>For example, add _small, to the filename to retrieve a scaled copy of the image at 100 x 100 px (for example, ipod-nano_small.png), or add _2048x2048 to retrieve a copy of the image constrained at 2048 x 2048 px resolution (for example, ipod-nano_2048x2048.png).</p>`,
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: '',
						description: 'Width dimension of the image which is determined on upload.',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: '',
						description: 'Height dimension of the image which is determined on upload.',
					},
					{
						displayName: 'Updated At',
						name: 'updated_at',
						type: 'dateTime',
						default: '',
						description: 'The date and time when the product image was last modified.',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'productOptions',
				type: 'fixedCollection',
				placeholder: 'Add Option',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: `The custom product property names like Size, Color, and Material. You can add up to 3 options of up to 255 characters each.`,
				options: [
					{
						displayName: 'Option',
						name: 'option',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: `Option\'s name.`,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: `Option\'s values.`,
							},
						],
					},
				],
			},
			{
				displayName: 'Product Type',
				name: 'product_type',
				type: 'string',
				default: '',
				description: 'A categorization for the product used for filtering and searching products.',
			},
			{
				displayName: 'Published At',
				name: 'published_at',
				type: 'dateTime',
				default: '',
				description: 'The date and time (ISO 8601 format) when the product was published. Can be set to null to unpublish the product from the Online Store channel.',
			},
			{
				displayName: 'Published Scope',
				name: 'published_scope',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Global',
						value: 'global',
						description: 'The product is published to both the Online Store channel and the Point of Sale channel.',
					},
					{
						name: 'Web',
						value: 'web',
						description: 'The product is published to the Online Store channel but not published to the Point of Sale channel.',
					},
				],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A string of comma-separated tags that are used for filtering and search. A product can have up to 250 tags. Each tag can have up to 255 characters.',
			},
			{
				displayName: 'Template Suffix',
				name: 'template_suffix',
				type: 'string',
				default: '',
				description: 'The suffix of the Liquid template used for the product page. If this property is specified, then the product page uses a template called "product.suffix.liquid", where "suffix" is the value of this property. If this property is "" or null, then the product page uses the default template "product.liquid". (default: null)',
			},
			// {
			// 	displayName: 'Variants',
			// 	name: 'variants',
			// 	type: 'collection',
			// 	placeholder: 'Add Variant Field',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	default: {},
			// 	description: 'A list of product variants, each representing a different version of the product.',
			// 	options: [
			// 		{
			// 			displayName: 'Created At',
			// 			name: 'created_at',
			// 			type: 'dateTime',
			// 			default: '',
			// 			description: 'The date and time when the product image was created.',
			// 		},
			// 	],
			// },
			{
				displayName: 'Vendor',
				name: 'vendor',
				type: 'string',
				default: '',
				description: 'The name of the product\'s vendor.',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'product',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Body HTML',
				name: 'body_html',
				type: 'string',
				default: '',
				description: 'A description of the product. Supports HTML formatting.',
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: `A unique human-friendly string for the product. Automatically generated from the product's title. Used by the Liquid templating language to refer to objects.`,
			},
			{
				displayName: 'Images',
				name: 'images',
				type: 'collection',
				placeholder: 'Add Image Field',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: 'A list of product image objects, each one representing an image associated with the product.',
				options: [
					{
						displayName: 'Created At',
						name: 'created_at',
						type: 'dateTime',
						default: '',
						description: 'The date and time when the product image was created.',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						default: '',
						description: 'A unique numeric identifier for the product image.',
					},
					{
						displayName: 'Position',
						name: 'position',
						type: 'number',
						default: '',
						description: `The order of the product image in the list. The first product image is at position 1 and is the "main" image for the product.`,
					},
					{
						displayName: 'Product ID',
						name: 'product_id',
						type: 'number',
						default: '',
						description: 'The id of the product associated with the image.',
					},
					{
						displayName: 'Variant IDs',
						name: 'variant_ids',
						type: 'number',
						typeOptions: {
							multipleValues: true,
						},
						default: '',
						description: 'An array of variant ids associated with the image.',
					},
					{
						displayName: 'Source',
						name: 'src',
						type: 'string',
						default: '',
						description: `<p>Specifies the location of the product image. This parameter supports URL filters that you can use to retrieve modified copies of the image.</p><p>For example, add _small, to the filename to retrieve a scaled copy of the image at 100 x 100 px (for example, ipod-nano_small.png), or add _2048x2048 to retrieve a copy of the image constrained at 2048 x 2048 px resolution (for example, ipod-nano_2048x2048.png).</p>`,
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: '',
						description: 'Width dimension of the image which is determined on upload.',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: '',
						description: 'Height dimension of the image which is determined on upload.',
					},
					{
						displayName: 'Updated At',
						name: 'updated_at',
						type: 'dateTime',
						default: '',
						description: 'The date and time when the product image was last modified.',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'productOptions',
				type: 'fixedCollection',
				placeholder: 'Add Option',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description: `The custom product property names like Size, Color, and Material. You can add up to 3 options of up to 255 characters each.`,
				options: [
					{
						displayName: 'Option',
						name: 'option',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: `Option\'s name.`,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: `Option\'s values.`,
							},
						],
					},
				],
			},
			{
				displayName: 'Product Type',
				name: 'product_type',
				type: 'string',
				default: '',
				description: 'A categorization for the product used for filtering and searching products.',
			},
			{
				displayName: 'Published At',
				name: 'published_at',
				type: 'dateTime',
				default: '',
				description: 'The date and time (ISO 8601 format) when the product was published. Can be set to null to unpublish the product from the Online Store channel.',
			},
			{
				displayName: 'Published Scope',
				name: 'published_scope',
				type: 'options',
				default: '',
				options: [
					{
						name: 'Global',
						value: 'global',
						description: 'The product is published to both the Online Store channel and the Point of Sale channel.',
					},
					{
						name: 'Web',
						value: 'web',
						description: 'The product is published to the Online Store channel but not published to the Point of Sale channel.',
					},
				],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A string of comma-separated tags that are used for filtering and search. A product can have up to 250 tags. Each tag can have up to 255 characters.',
			},
			{
				displayName: 'Template Suffix',
				name: 'template_suffix',
				type: 'string',
				default: '',
				description: 'The suffix of the Liquid template used for the product page. If this property is specified, then the product page uses a template called "product.suffix.liquid", where "suffix" is the value of this property. If this property is "" or null, then the product page uses the default template "product.liquid". (default: null)',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The name of the product.',
			},
			// {
			// 	displayName: 'Variants',
			// 	name: 'variants',
			// 	type: 'collection',
			// 	placeholder: 'Add Variant Field',
			// 	typeOptions: {
			// 		multipleValues: true,
			// 	},
			// 	default: {},
			// 	description: 'A list of product variants, each representing a different version of the product.',
			// 	options: [
			// 		{
			// 			displayName: 'Created At',
			// 			name: 'created_at',
			// 			type: 'dateTime',
			// 			default: '',
			// 			description: 'The date and time when the product image was created.',
			// 		},
			// 	],
			// },
			{
				displayName: 'Vendor',
				name: 'vendor',
				type: 'string',
				default: '',
				description: 'The name of the product\'s vendor.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                product:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
	/* -------------------------------------------------------------------------- */
	/*                                product:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'product',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: `Fields the product will return, formatted as a string of comma-separated values.
				By default all the fields are returned`,
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                product:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 250,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				displayName: 'Collection ID',
				name: 'collection_id',
				type: 'string',
				default: '',
				description: 'Filter results by product collection ID.',
			},
			{
				displayName: 'Created At Max',
				name: 'created_at_max',
				type: 'dateTime',
				default: '',
				description: 'Show products created before date.',
			},
			{
				displayName: 'Created At Min',
				name: 'created_at_min',
				type: 'dateTime',
				default: '',
				description: 'Show products created after date',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Show only certain fields, specified by a comma-separated list of field names.',
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: 'Filter results by product handle.',
			},
			{
				displayName: 'IDs',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'Return only products specified by a comma-separated list of product IDs.',
			},
			{
				displayName: 'Presentment Currencies',
				name: 'presentment_currencies',
				type: 'string',
				default: '',
				description: 'Return presentment prices in only certain currencies, specified by a comma-separated list of ISO 4217 currency codes.',
			},
			{
				displayName: 'Product Type',
				name: 'product_type',
				type: 'string',
				default: '',
				description: 'Filter results by product type.',
			},
			{
				displayName: 'Published At Max',
				name: 'published_at_max',
				type: 'dateTime',
				default: '',
				description: 'Show products published before date.',
			},
			{
				displayName: 'Published At Min',
				name: 'published_at_min',
				type: 'dateTime',
				default: '',
				description: 'Show products published after date.',
			},
			{
				displayName: 'Published Status',
				name: 'published_status',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
						description: 'Show all products.',
					},
					{
						name: 'Published',
						value: 'published',
						description: 'Show only published products.',
					},
					{
						name: 'Unpublished',
						value: 'unpublished',
						description: 'Show only unpublished products.',
					},
				],
				default: 'any',
				description: 'Return products by their published status.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Filter results by product title.',
			},
			{
				displayName: 'Updated At Max',
				name: 'updated_at_max',
				type: 'dateTime',
				default: '',
				description: 'Show products last updated before date.',
			},
			{
				displayName: 'Updated At Min',
				name: 'updated_at_min',
				type: 'dateTime',
				default: '',
				description: 'Show products last updated after date.',
			},
			{
				displayName: 'Vendor',
				name: 'vendor',
				type: 'string',
				default: '',
				description: 'Filter results by product vendor.',
			},
		],
	},
];
