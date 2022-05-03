import { INodeProperties } from 'n8n-workflow';

export const generateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['generate'],
			},
		},
		options: [
			{
				name: 'City',
				value: 'city',
				description: 'Get a random City.',
			},
			{
				name: 'Name',
				value: 'name',
				description: 'Get random Name.',
			},
			{
				name: 'Number',
				value: 'number',
				description: 'Generate a random Number.',
			},
			{
				name: 'String',
				value: 'string',
				description: 'Generate a random String.',
			},
			{
				name: 'QR Code',
				value: 'qrcode',
				description: 'Encode or decode a QR code.',
			},
			{
				name: 'Shortened URL',
				value: 'shortenedUrl',
				description: 'Create, delete or update shortened urls.',
			},
		],
		default: 'city',
	},
] as INodeProperties[];

export const generateFields = [
	// generate: city
	// generate: number
	{
		displayName: 'Range Start',
		name: 'rangeStart',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: ['number'],
				resource: ['generate'],
			},
		},
		default: 1,
		description: 'The number will be bigger than or equal to the range start.',
	},
	{
		displayName: 'Range End',
		name: 'rangeEnd',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: ['number'],
				resource: ['generate'],
			},
		},
		default: 10,
		description: 'The number will be smaller than or equal to the range end.',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['number'],
				resource: ['generate'],
			},
		},
		options: [
			{
				name: 'Integer',
				value: 'integer',
			},
			{
				name: 'Decimal',
				value: 'decimal',
			},
		],
		default: 'integer',
		description: 'Integer or Decimal',
	},
	// generate: name
	// generate: string
	{
		displayName: 'Length',
		name: 'length',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: ['string'],
				resource: ['generate'],
			},
		},
		default: 10,
		description: 'Define how many chars your string should have.',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['string'],
				resource: ['generate'],
			},
		},
		options: [
			{
				name: 'Only Numbers',
				value: 1,
			},
			{
				name: 'Capital Letters + Lowercase Letters',
				value: 2,
			},
			{
				name: 'Lowercase Letters',
				value: 3,
			},
			{
				name: 'Capital Letters',
				value: 4,
			},
			{
				name: 'Numbers + Lowercase Letters',
				value: 5,
			},
			{
				name: 'Numbers + Capital Letters',
				value: 6,
			},
			{
				name: 'Numbers + Capital Letters + Lowercase Letters + Special Characters',
				value: 7,
			},
		],
		default: '',
		description: 'Characters to include in your string.',
	},
	// generate: qrcode
	{
		displayName: 'Operation',
		name: 'qrcodeop',
		type: 'options',
		options: [
			{
				name: 'Encode data to qr code',
				value: 'encode',
			},
			{
				name: 'Decode a qr code',
				value: 'decode',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['qrcode'],
				resource: ['generate'],
			},
		},
		default: 'encode',
	},
	{
		displayName: 'Data you want to encode',
		name: 'data',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['qrcode'],
				resource: ['generate'],
				qrcodeop: ['encode'],
			},
		},
		default: '',
	},
	{
		displayName: 'URL to QR Code image',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['qrcode'],
				resource: ['generate'],
				qrcodeop: ['decode'],
			},
		},
		default: '',
	},
	// generate: shortendurl
	{
		displayName: 'Operation',
		name: 'shortenedurlop',
		type: 'options',
		options: [
			{
				name: 'Add new shortened url',
				value: 'add',
			},
			{
				name: 'Delete shortened url',
				value: 'del',
			},
			{
				name: 'Update shortened url',
				value: 'put',
				help: 'Update the destination of a shortened url.',
			},
			{
				name: 'List all your shortened urls',
				value: 'list',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: ['shortenedUrl'],
				resource: ['generate'],
			},
		},
		default: 'add',
	},
	// generate: shortendurl: add
	{
		displayName: 'Destination of the shortened url',
		name: 'destination',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['schortenedUrl'],
				resource: ['generate'],
				shortenedurlop: ['add', 'put'],
			},
		},
		default: '',
	},
	{
		displayName: 'Optional custom identifier',
		name: 'custom',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['shortenedUrl'],
				resource: ['generate'],
				shortenedurlop: ['add'],
			},
		},
		default: '',
	},
	// generate: shortendurl: del
	{
		displayName: 'Delete a shortened url',
		name: 'identifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['shortenedUrl'],
				resource: ['generate'],
				shortenedurlop: ['del', 'put'],
			},
		},
		default: '',
	},
	// generate: shortendurl: put
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['shortenedUrl'],
				resource: ['generate'],
				shortenedurlop: ['put'],
			},
		},
		default: '',
		help: 'Identifier of the shortened url you want ot edit or delete.',
	},
	// generate: shortendurl: list
] as INodeProperties[];
