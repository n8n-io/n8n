import {
	INodeProperties
} from 'n8n-workflow';

export const destinationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [ 'destinations' ],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new destination.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific destination.',
			},

		],
		default: 'get',
	},
] as INodeProperties[];

const unparsedField = {
	displayName: 'Unparsed adress',
	name: 'unparsed',
	type: 'boolean',
	description: 'Whether the address is specified in a single.',
	default: false,
} as INodeProperties;

const unparsedAddressField = {
	displayName: 'Destination address',
	name: 'address',
	type: 'string',
	description: 'The destination\'s street address details.',
	default: null,
} as INodeProperties;

const unparsedAddressNumberField = {
	displayName: 'Number',
	name: 'addressNumber',
	type: 'string',
	description: 'The number component of this address, it may also contain letters.',
	default: '',
} as INodeProperties;

const unparsedAddressStreetField = {
	displayName: 'Street',
	name: 'addressStreet',
	type: 'string',
	description: 'The name of the street.',
	default: '',
} as INodeProperties;

const unparsedAddressCityField = {
	displayName: 'City',
	name: 'addressCity',
	type: 'string',
	description: 'The name of the municipality.',
	default: '',
} as INodeProperties;

const unparsedAddressCountryField = {
	displayName: 'Country',
	name: 'addressCountry',
	type: 'string',
	description: 'The name of the country.',
	default: '',
} as INodeProperties;

const addressNameField = {
	displayName: 'Address name',
	name: 'addressName',
	type: 'string',
	default: '',
	description: 'A name associated with this address.',
} as INodeProperties;

const addressApartmentField = {
	displayName: 'Apartment',
	name: 'addressApartment',
	type: 'string',
	default: '',
	description: 'The suite or apartment number, or any additional relevant information.',
} as INodeProperties;

const addressNoteField = {
	displayName: 'Address notes',
	name: 'addressNotes',
	type: 'string',
	default: '',
	description: 'Notes about the destination.',
} as INodeProperties;

const addressPostalCodeField = {
	displayName: 'Postal code',
	name: 'addressPostalCode',
	type: 'string',
	default: '',
	description: 'The postal or zip code.',
} as INodeProperties;

export const destinationFields = [
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		displayOptions: {
			show: {
				resource: [ 'destinations' ],
			},
			hide: {
				operation: [ 'create' ],
			},
		},
		default: '',
		required: true,
		description: 'The ID of the destination object for lookup.',
	},
	{
		...unparsedField,
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
			},
		},
		required: true,
	},
	{
		...unparsedAddressField,
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
				unparsed: [ true ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressNumberField,
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressStreetField,
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressCityField,
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressCountryField,
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional destination fields',
		name: 'additionalDestinationFields',
		type: 'collection',
		placeholder: 'Add destination fields',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
				unparsed: [ true ],
			},
		},
		options: [
			addressNameField,
			addressApartmentField,
			addressNoteField,
		],
	},
	{
		displayName: 'Additional destination fields',
		name: 'additionalDestinationFields',
		type: 'collection',
		placeholder: 'Add destination fields',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'tasks',
					'hubs',
					'destinations',
				],
				operation: [
					'create',
					'createBatch',
				],
				unparsed: [
					false,
					null,
				],
			},
		},
		options: [
			addressNameField,
			addressApartmentField,
			addressNoteField,
			addressPostalCodeField,
		],
	},
	{
		...unparsedField,
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressField,
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
				unparsed: [ true ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressNumberField,
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressStreetField,
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressCityField,
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		...unparsedAddressCountryField,
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
				unparsed: [ false ],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional destination fields',
		name: 'additionalDestinationFields',
		type: 'collection',
		placeholder: 'Add destination fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
				unparsed: [ true ],
			},
		},
		options: [
			addressNameField,
			addressApartmentField,
			addressNoteField,
		],
	},
	{
		displayName: 'Additional destination fields',
		name: 'additionalDestinationFields',
		type: 'collection',
		placeholder: 'Add destination fields',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'hubs' ],
				operation: [ 'update' ],
				unparsed: [
					false,
					null,
				],
			},
		},
		options: [
			addressNameField,
			addressApartmentField,
			addressNoteField,
			addressPostalCodeField,
		],
	},
]  as INodeProperties[];
