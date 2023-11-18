import type { INodeProperties } from 'n8n-workflow';

export const lightOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['light'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a light',
				action: 'Delete a light',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a light',
				action: 'Get a light',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve many lights',
				action: 'Get many lights',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a light',
				action: 'Update a light',
			},
		],
		default: 'update',
	},
];

export const lightFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 light:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Light ID',
		name: 'lightId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['light'],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 light:getAll                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['light'],
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
				operation: ['getAll'],
				resource: ['light'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 light:get                                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Light ID',
		name: 'lightId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['light'],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 light:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Light Name or ID',
		name: 'lightId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getLights',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['light'],
			},
		},
		default: '',
	},
	{
		displayName: 'On',
		name: 'on',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['light'],
			},
		},
		default: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: 'On/Off state of the light',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['light'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Alert Effect',
				name: 'alert',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'The light is not performing an alert effect',
					},
					{
						name: 'Select',
						value: 'select',
						description: 'The light is performing one breathe cycle',
					},
					{
						name: 'LSelect',
						value: 'lselect',
						description:
							'The light is performing breathe cycles for 15 seconds or until an "alert": "none" command is received',
					},
				],
				default: '',
				description: 'The alert effect, is a temporary change to the bulb’s state',
			},
			{
				displayName: 'Brightness',
				name: 'bri',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 254,
				},
				default: 100,
				description:
					'The brightness value to set the light to. Brightness is a scale from 1 (the minimum the light is capable of) to 254 (the maximum).',
			},
			{
				displayName: 'Brightness Increments',
				name: 'bri_inc',
				type: 'number',
				typeOptions: {
					minValue: -254,
					maxValue: 254,
				},
				default: 0,
				description:
					'Increments or decrements the value of the brightness. This value is ignored if the Brightness attribute is provided.',
			},
			{
				displayName: 'Color Temperature',
				name: 'ct',
				type: 'number',
				default: 0,
				description:
					'The Mired color temperature of the light. 2012 connected lights are capable of 153 (6500K) to 500 (2000K).',
			},
			{
				displayName: 'Color Temperature Increments',
				name: 'ct_inc',
				type: 'number',
				typeOptions: {
					minValue: -65534,
					maxValue: 65534,
				},
				default: 0,
				description:
					'Increments or decrements the value of the ct. ct_inc is ignored if the ct attribute is provided.',
			},
			{
				displayName: 'Coordinates',
				name: 'xy',
				type: 'string',
				default: '',
				placeholder: '0.64394,0.33069',
				description:
					'The x and y coordinates of a color in CIE color space. The first entry is the x coordinate and the second entry is the y coordinate. Both x and y are between 0 and 1',
			},
			{
				displayName: 'Coordinates Increments',
				name: 'xy_inc',
				type: 'string',
				default: '',
				placeholder: '0.5,0.5',
				description:
					'Increments or decrements the value of the xy. This value is ignored if the Coordinates attribute is provided. Any ongoing color transition is stopped. Max value [0.5, 0.5]',
			},
			{
				displayName: 'Dynamic Effect',
				name: 'effect',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Color Loop',
						value: 'colorloop',
					},
				],
				default: '',
				description: 'The dynamic effect of the light',
			},
			{
				displayName: 'Hue',
				name: 'hue',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 65535,
				},
				default: 0,
				description:
					'The hue value to set light to.The hue value is a wrapping value between 0 and 65535. Both 0 and 65535 are red, 25500 is green and 46920 is blue.',
			},
			{
				displayName: 'Hue Increments',
				name: 'hue_inc',
				type: 'number',
				typeOptions: {
					minValue: -65534,
					maxValue: 65534,
				},
				default: 0,
				description:
					'Increments or decrements the value of the hue. Hue Increments is ignored if the Hue attribute is provided.',
			},
			{
				displayName: 'Saturation',
				name: 'sat',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 254,
				},
				default: 0,
				description:
					'Saturation of the light. 254 is the most saturated (colored) and 0 is the least saturated (white).',
			},
			{
				displayName: 'Saturation Increments',
				name: 'sat_inc',
				type: 'number',
				typeOptions: {
					minValue: -254,
					maxValue: 254,
				},
				default: 0,
				description:
					'Increments or decrements the value of the sat. This value is ignored if the Saturation attribute is provided.',
			},
			{
				displayName: 'Transition Time',
				name: 'transitiontime',
				type: 'number',
				typeOptions: {
					minVale: 1,
				},
				default: 4,
				description:
					'The duration in seconds of the transition from the light’s current state to the new state',
			},
		],
	},
];
