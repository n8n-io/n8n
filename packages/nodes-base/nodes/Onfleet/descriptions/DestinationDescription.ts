import type { INodeProperties } from 'n8n-workflow';

export const destinationOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['destination'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new destination',
				action: 'Create a destination',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific destination',
				action: 'Get a destination',
			},
		],
		default: 'get',
	},
];

const unparsedField = {
	displayName: 'Unparsed Address',
	name: 'unparsed',
	type: 'boolean',
	description: 'Whether or not the address is specified in a single unparsed string',
	default: false,
} as INodeProperties;

const unparsedAddressField = {
	displayName: 'Destination Address',
	name: 'address',
	type: 'string',
	description: "The destination's street address details",
	default: '',
} as INodeProperties;

const unparsedAddressNumberField = {
	displayName: 'Number',
	name: 'addressNumber',
	type: 'string',
	description: 'The number component of this address, it may also contain letters',
	default: '',
} as INodeProperties;

const unparsedAddressStreetField = {
	displayName: 'Street',
	name: 'addressStreet',
	type: 'string',
	description: 'The name of the street',
	default: '',
} as INodeProperties;

const unparsedAddressCityField = {
	displayName: 'City',
	name: 'addressCity',
	type: 'string',
	description: 'The name of the municipality',
	default: '',
} as INodeProperties;

const unparsedAddressCountryField = {
	displayName: 'Country',
	name: 'addressCountry',
	type: 'string',
	description: 'The name of the country',
	default: '',
} as INodeProperties;

const unparsedAddressStateField = {
	displayName: 'State',
	name: 'addressState',
	type: 'string',
	default: '',
} as INodeProperties;

const addressNameField = {
	displayName: 'Address Name',
	name: 'addressName',
	type: 'string',
	default: '',
	description: 'A name associated with this address',
} as INodeProperties;

const addressApartmentField = {
	displayName: 'Apartment',
	name: 'addressApartment',
	type: 'string',
	default: '',
	description: 'The suite or apartment number, or any additional relevant information',
} as INodeProperties;

const addressNoteField = {
	displayName: 'Address Notes',
	name: 'addressNotes',
	type: 'string',
	default: '',
	description: 'Notes about the destination',
} as INodeProperties;

const addressPostalCodeField = {
	displayName: 'Postal Code',
	name: 'addressPostalCode',
	type: 'string',
	default: '',
	description: 'The postal or zip code',
} as INodeProperties;

export const destinationExternalField = {
	displayName: 'Destination',
	name: 'destination',
	type: 'fixedCollection',
	placeholder: 'Add Destination',
	default: {},
	options: [
		{
			displayName: 'Destination Properties',
			name: 'destinationProperties',
			default: {},
			values: [
				{
					...unparsedField,
					required: false,
				},
				{
					...unparsedAddressField,
					displayOptions: {
						show: {
							unparsed: [true],
						},
					},
					required: true,
				},
				{
					...unparsedAddressNumberField,
					displayOptions: {
						show: {
							unparsed: [false],
						},
					},
					required: true,
				},
				{
					...unparsedAddressStreetField,
					displayOptions: {
						show: {
							unparsed: [false],
						},
					},
					required: true,
				},
				{
					...unparsedAddressCityField,
					displayOptions: {
						show: {
							unparsed: [false],
						},
					},
					required: true,
				},
				{
					...unparsedAddressStateField,
					displayOptions: {
						show: {
							unparsed: [false],
						},
					},
					required: true,
				},
				{
					...unparsedAddressCountryField,
					displayOptions: {
						show: {
							unparsed: [false],
						},
					},
					required: true,
				},
				{
					displayOptions: {
						show: {
							unparsed: [false],
						},
					},
					...addressPostalCodeField,
					required: false,
				},
				{
					...addressNameField,
					required: false,
				},
				{
					...addressApartmentField,
					required: false,
				},
				{
					...addressNoteField,
					required: false,
				},
			],
		},
	],
} as INodeProperties;

export const destinationFields: INodeProperties[] = [
	{
		displayName: 'Destination ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['destination'],
			},
			hide: {
				operation: ['create'],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the destination object for lookup',
	},
	{
		...unparsedField,
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		...unparsedAddressField,
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
				unparsed: [true],
			},
		},
		required: true,
	},
	{
		...unparsedAddressNumberField,
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
				unparsed: [false],
			},
		},
		required: true,
	},
	{
		...unparsedAddressStreetField,
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
				unparsed: [false],
			},
		},
		required: true,
	},
	{
		...unparsedAddressCityField,
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
				unparsed: [false],
			},
		},
		required: true,
	},
	{
		...unparsedAddressCountryField,
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
				unparsed: [false],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
				unparsed: [true],
			},
		},
		options: [addressApartmentField, addressNameField, addressNoteField],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['destination'],
				operation: ['create'],
				unparsed: [false],
			},
		},
		options: [addressApartmentField, addressNameField, addressNoteField, addressPostalCodeField],
	},
];
