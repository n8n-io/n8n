import { INodeProperties } from 'n8n-workflow';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['product'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
				action: 'Create a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
				action: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a product',
				action: 'Get a product',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get all products',
				action: 'Get many products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
				action: 'Update a product',
			},
		],
		default: 'create',
	},
];

export const productFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                product:create                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
		description: 'Product name',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Backorders',
				name: 'backorders',
				type: 'options',
				options: [
					{
						name: 'No',
						value: 'no',
					},
					{
						name: 'Notify',
						value: 'notify',
					},
					{
						name: 'Yes',
						value: 'yes',
					},
				],
				default: 'no',
				description: 'If managing stock, this controls if backorders are allowed',
			},
			{
				displayName: 'Button Text',
				name: 'buttonText',
				type: 'string',
				default: '',
				description: 'Product external button text. Only for external products.',
			},
			{
				displayName: 'Catalog Visibility',
				name: 'catalogVisibility',
				type: 'options',
				options: [
					{
						name: 'Catalog',
						value: 'catalog',
					},
					{
						name: 'Hidden',
						value: 'hidden',
					},
					{
						name: 'Search',
						value: 'search',
					},
					{
						name: 'Visible',
						value: 'visible',
					},
				],
				default: 'visible',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				default: [],
				description:
					'List of categories. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Cross Sell IDs',
				name: 'crossSellIds',
				type: 'string',
				default: '',
				description: 'List of cross-sell products IDs. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Date On Sale From',
				name: 'dateOnSaleFrom',
				type: 'dateTime',
				default: '',
				description: "Start date of sale price, in the site's timezone",
			},
			{
				displayName: 'Date On Sale To',
				name: 'dateOnSaleTo',
				type: 'dateTime',
				default: '',
				description: "Ennd date of sale price, in the site's timezone",
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Product description',
			},
			{
				displayName: 'Downloadable',
				name: 'downloadable',
				type: 'boolean',
				default: false,
				description: 'Whether the product is downloadable',
			},
			{
				displayName: 'External URL',
				name: 'externalUrl',
				type: 'string',
				default: '',
				description: 'Product external URL. Only for external products.',
			},
			{
				displayName: 'Featured',
				name: 'featured',
				type: 'boolean',
				default: false,
				description: 'Whether the product is featured',
			},
			{
				displayName: 'Manage Stock',
				name: 'manageStock',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Stock management at product level',
			},
			{
				displayName: 'Menu Order',
				name: 'menuOrder',
				type: 'number',
				default: 1,
				description: 'Menu order, used to custom sort products',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Product parent ID',
			},
			{
				displayName: 'Purchase Note',
				name: 'purchaseNote',
				type: 'string',
				default: '',
				description: 'Optional note to send the customer after purchase',
			},
			{
				displayName: 'Regular Price',
				name: 'regularPrice',
				type: 'string',
				default: '',
				description: 'Product regular price',
			},
			{
				displayName: 'Reviews Allowed',
				name: 'reviewsAllowed',
				type: 'boolean',
				default: true,
				description: 'Whether to allow reviews',
			},
			{
				displayName: 'Sale Price',
				name: 'salePrice',
				type: 'string',
				default: '',
				description: 'Product sale price',
			},
			{
				displayName: 'Shipping Class',
				name: 'shippingClass',
				type: 'string',
				default: '',
				description: 'Shipping class slug',
			},
			{
				displayName: 'Short Description',
				name: 'shortDescription',
				type: 'string',
				default: '',
				description: 'Product short description',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
				description: 'Unique identifier',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Product slug',
			},
			{
				displayName: 'Sold Individually',
				name: 'soldIndividually',
				type: 'boolean',
				default: false,
				description: 'Whether to allow one item to be bought in a single order',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Publish',
						value: 'publish',
					},
				],
				default: 'publish',
				description: 'A named status for the product',
			},
			{
				displayName: 'Stock Quantity',
				name: 'stockQuantity',
				type: 'number',
				default: 1,
			},
			{
				displayName: 'Stock Status',
				name: 'stockStatus',
				type: 'options',
				options: [
					{
						name: 'In Stock',
						value: 'instock',
					},
					{
						name: 'Out Of Stock',
						value: 'outofstock',
					},
					{
						name: 'On Back Order',
						value: 'onbackorder',
					},
				],
				default: 'instock',
				description: 'Controls the stock status of the product',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description:
					'List of tags. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Tax Class',
				name: 'taxClass',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Status',
				name: 'taxStatus',
				type: 'options',
				options: [
					{
						name: 'Taxable',
						value: 'taxable',
					},
					{
						name: 'Shipping',
						value: 'shipping',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'taxable',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Grouped',
						value: 'grouped',
					},
					{
						name: 'External',
						value: 'external',
					},
					{
						name: 'Variable',
						value: 'variable',
					},
				],
				default: 'simple',
				description: 'Product type',
			},
			{
				displayName: 'Upsell IDs',
				name: 'upsellIds',
				type: 'string',
				default: '',
				description: 'List of up-sell products IDs. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Virtual',
				name: 'virtual',
				type: 'boolean',
				default: false,
				description: 'Whether the product is virtual',
			},
			{
				displayName: 'Weight',
				name: 'weight',
				type: 'string',
				default: '',
				description: 'Product weight',
			},
		],
	},
	{
		displayName: 'Dimensions',
		name: 'dimensionsUi',
		placeholder: 'Add Dimension',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
		description: 'Product dimensions',
		options: [
			{
				name: 'dimensionsValues',
				displayName: 'Dimension',
				values: [
					{
						displayName: 'Height',
						name: 'height',
						type: 'string',
						default: '',
						description: 'Product height',
					},
					{
						displayName: 'Length',
						name: 'length',
						type: 'string',
						default: '',
						description: 'Product length',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'string',
						default: '',
						description: 'Product width',
					},
				],
			},
		],
	},
	{
		displayName: 'Images',
		name: 'imagesUi',
		placeholder: 'Add Image',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
		description: 'Product Image',
		options: [
			{
				name: 'imagesValues',
				displayName: 'Image',
				values: [
					{
						displayName: 'Alt',
						name: 'alt',
						type: 'string',
						default: '',
						description: 'Image alternative text',
					},
					{
						displayName: 'Src',
						name: 'src',
						type: 'string',
						default: '',
						description: 'Image URL',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Image name',
					},
				],
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadataUi',
		placeholder: 'Add Metadata',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
		description: 'Meta data',
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the metadata key to add',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set for the metadata key',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 product:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Backorders',
				name: 'backorders',
				type: 'options',
				options: [
					{
						name: 'No',
						value: 'no',
					},
					{
						name: 'Notify',
						value: 'notify',
					},
					{
						name: 'Yes',
						value: 'yes',
					},
				],
				default: 'no',
				description: 'If managing stock, this controls if backorders are allowed',
			},
			{
				displayName: 'Button Text',
				name: 'buttonText',
				type: 'string',
				default: '',
				description: 'Product external button text. Only for external products.',
			},
			{
				displayName: 'Catalog Visibility',
				name: 'catalogVisibility',
				type: 'options',
				options: [
					{
						name: 'Visible',
						value: 'visible',
					},
					{
						name: 'Catalog',
						value: 'catalog',
					},
					{
						name: 'Search',
						value: 'search',
					},
					{
						name: 'Hidden',
						value: 'hidden',
					},
				],
				default: 'visible',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				default: [],
				description:
					'List of categories. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Cross Sell IDs',
				name: 'crossSellIds',
				type: 'string',
				default: '',
				description: 'List of cross-sell products IDs. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Date On Sale From',
				name: 'dateOnSaleFrom',
				type: 'dateTime',
				default: '',
				description: "Start date of sale price, in the site's timezone",
			},
			{
				displayName: 'Date On Sale To',
				name: 'dateOnSaleTo',
				type: 'dateTime',
				default: '',
				description: "Ennd date of sale price, in the site's timezone",
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Product description',
			},
			{
				displayName: 'Downloadable',
				name: 'downloadable',
				type: 'boolean',
				default: false,
				description: 'Whether the product is downloadable',
			},
			{
				displayName: 'External URL',
				name: 'externalUrl',
				type: 'string',
				default: '',
				description: 'Product external URL. Only for external products.',
			},
			{
				displayName: 'Featured',
				name: 'featured',
				type: 'boolean',
				default: false,
				description: 'Whether the product is featured',
			},
			{
				displayName: 'Manage Stock',
				name: 'manageStock',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Stock management at product level',
			},
			{
				displayName: 'Menu Order',
				name: 'menuOrder',
				type: 'number',
				default: 1,
				description: 'Menu order, used to custom sort products',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Product name',
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Product parent ID',
			},
			{
				displayName: 'Purchase Note',
				name: 'purchaseNote',
				type: 'string',
				default: '',
				description: 'Optional note to send the customer after purchase',
			},
			{
				displayName: 'Regular Price',
				name: 'regularPrice',
				type: 'string',
				default: '',
				description: 'Product regular price',
			},
			{
				displayName: 'Reviews Allowed',
				name: 'reviewsAllowed',
				type: 'boolean',
				default: true,
				description: 'Whether to allow reviews',
			},
			{
				displayName: 'Sale Price',
				name: 'salePrice',
				type: 'string',
				default: '',
				description: 'Product sale price',
			},
			{
				displayName: 'Shipping Class',
				name: 'shippingClass',
				type: 'string',
				default: '',
				description: 'Shipping class slug',
			},
			{
				displayName: 'Short Description',
				name: 'shortDescription',
				type: 'string',
				default: '',
				description: 'Product short description',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
				description: 'Unique identifier',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Product slug',
			},
			{
				displayName: 'Sold Individually',
				name: 'soldIndividually',
				type: 'boolean',
				default: false,
				description: 'Whether to allow one item to be bought in a single order',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Publish',
						value: 'publish',
					},
				],
				default: 'publish',
				description: 'A named status for the product',
			},
			{
				displayName: 'Stock Quantity',
				name: 'stockQuantity',
				type: 'number',
				default: 1,
			},
			{
				displayName: 'Stock Status',
				name: 'stockStatus',
				type: 'options',
				options: [
					{
						name: 'In Stock',
						value: 'instock',
					},
					{
						name: 'Out Of Stock',
						value: 'outofstock',
					},
					{
						name: 'On Back Order',
						value: 'onbackorder',
					},
				],
				default: 'instock',
				description: 'Controls the stock status of the product',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description:
					'List of tags. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Tax Class',
				name: 'taxClass',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tax Status',
				name: 'taxStatus',
				type: 'options',
				options: [
					{
						name: 'Taxable',
						value: 'taxable',
					},
					{
						name: 'Shipping',
						value: 'shipping',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'taxable',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Grouped',
						value: 'grouped',
					},
					{
						name: 'External',
						value: 'external',
					},
					{
						name: 'Variable',
						value: 'variable',
					},
				],
				default: 'simple',
				description: 'Product type',
			},
			{
				displayName: 'Upsell IDs',
				name: 'upsellIds',
				type: 'string',
				default: '',
				description: 'List of up-sell products IDs. Multiple can be added separated by ,.',
			},
			{
				displayName: 'Virtual',
				name: 'virtual',
				type: 'boolean',
				default: false,
				description: 'Whether the product is virtual',
			},
			{
				displayName: 'Weight',
				name: 'weight',
				type: 'string',
				default: '',
				description: 'Product weight',
			},
		],
	},
	{
		displayName: 'Dimensions',
		name: 'dimensionsUi',
		placeholder: 'Add Dimension',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: false,
		},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		description: 'Product dimensions',
		options: [
			{
				name: 'dimensionsValues',
				displayName: 'Dimension',
				values: [
					{
						displayName: 'Height',
						name: 'height',
						type: 'string',
						default: '',
						description: 'Product height',
					},
					{
						displayName: 'Length',
						name: 'length',
						type: 'string',
						default: '',
						description: 'Product length',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'string',
						default: '',
						description: 'Product width',
					},
				],
			},
		],
	},
	{
		displayName: 'Images',
		name: 'imagesUi',
		placeholder: 'Add Image',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		description: 'Product Image',
		options: [
			{
				name: 'imagesValues',
				displayName: 'Image',
				values: [
					{
						displayName: 'Alt',
						name: 'alt',
						type: 'string',
						default: '',
						description: 'Image alternative text',
					},
					{
						displayName: 'Src',
						name: 'src',
						type: 'string',
						default: '',
						description: 'Image URL',
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Image name',
					},
				],
			},
		],
	},
	{
		displayName: 'Metadata',
		name: 'metadataUi',
		placeholder: 'Add Metadata',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		description: 'Meta data',
		options: [
			{
				name: 'metadataValues',
				displayName: 'Metadata',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Name of the metadata key to add',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to set for the metadata key',
					},
				],
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   product:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['get'],
			},
		},
		default: '',
	},
	/* -------------------------------------------------------------------------- */
	/*                                   product:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'After',
				name: 'after',
				type: 'dateTime',
				default: '',
				description: 'Limit response to resources published after a given ISO8601 compliant date',
			},
			{
				displayName: 'Before',
				name: 'before',
				type: 'dateTime',
				default: '',
				description: 'Limit response to resources published before a given ISO8601 compliant date',
			},
			{
				displayName: 'Category Name or ID',
				name: 'category',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getCategories',
				},
				description:
					'Limit result set to products assigned a specific category ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Context',
				name: 'context',
				type: 'options',
				options: [
					{
						name: 'View',
						value: 'view',
					},
					{
						name: 'Embed',
						value: 'embed',
					},
					{
						name: 'Edit',
						value: 'edit',
					},
				],
				default: 'view',
				description: 'Scope under which the request is made; determines fields present in response',
			},
			{
				displayName: 'Featured',
				name: 'featured',
				type: 'boolean',
				default: false,
				description: 'Whether to limit the result set to featured products',
			},
			{
				displayName: 'Max Price',
				name: 'maxPrice',
				type: 'string',
				default: '',
				description: 'Limit result set to products based on a maximun price',
			},
			{
				displayName: 'Min Price',
				name: 'minPrice',
				type: 'string',
				default: '',
				description: 'Limit result set to products based on a minimum price',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Order sort attribute ascending or descending',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Date',
						value: 'date',
					},
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Include',
						value: 'include',
					},
					{
						name: 'Slug',
						value: 'slug',
					},
					{
						name: 'Title',
						value: 'title',
					},
				],
				default: 'id',
				description: 'Sort collection by object attribute',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Limit results to those matching a string',
			},
			{
				displayName: 'SKU',
				name: 'sku',
				type: 'string',
				default: '',
				description: 'Limit result set to products with a specific SKU',
			},
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Limit result set to products with a specific slug',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Any',
						value: 'any',
					},
					{
						name: 'Draft',
						value: 'draft',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Publish',
						value: 'publish',
					},
				],
				default: 'any',
				description: 'Limit result set to products assigned a specific status',
			},
			{
				displayName: 'Stock Status',
				name: 'stockStatus',
				type: 'options',
				options: [
					{
						name: 'In Stock',
						value: 'instock',
					},
					{
						name: 'Out Of Stock',
						value: 'outofstock',
					},
					{
						name: 'On Back Order',
						value: 'onbackorder',
					},
				],
				default: '',
				description: 'Controls the stock status of the product',
			},
			{
				displayName: 'Tag Name or ID',
				name: 'tag',
				type: 'options',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				description:
					'Limit result set to products assigned a specific tag ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Tax Class',
				name: 'taxClass',
				type: 'options',
				options: [
					{
						name: 'Standar',
						value: 'standard',
					},
					{
						name: 'Reduced Rate',
						value: 'reduced-rate',
					},
					{
						name: 'Zero Rate',
						value: 'zero-rate.',
					},
				],
				default: '',
				description: 'Limit result set to products with a specific tax class',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Grouped',
						value: 'grouped',
					},
					{
						name: 'External',
						value: 'external',
					},
					{
						name: 'Variable',
						value: 'variable',
					},
				],
				default: 'simple',
				description: 'Product type',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   product:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['delete'],
			},
		},
		default: '',
	},
];
