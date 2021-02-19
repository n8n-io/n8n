
export const shippingInformation = {
	displayName: 'Shipping Information',
	name: 'shipping',
	type: 'fixedCollection',
	description: 'Shipping information for the customer.',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Field',
	options: [
		{
			displayName: 'Shipping Properties',
			name: 'shippingProperties',
			values: [
				{
					displayName: 'Recipient Address',
					name: 'address',
					type: 'fixedCollection',
					default: {},
					placeholder: 'Add Address Details',
					options: [
						{
							displayName: 'Details',
							name: 'details',
							values: [
								{
									displayName: 'Line 1',
									name: 'line1',
									description: 'Address line 1 (e.g., street, PO Box, or company name).',
									type: 'string',
									default: '',
								},
								{
									displayName: 'City',
									name: 'city',
									description: 'City, district, suburb, town, or village.',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Country',
									name: 'country',
									description: 'Two-letter country code (<a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>).',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Line 2',
									name: 'line2',
									description: 'Address line 2 (e.g., apartment, suite, unit, or building).',
									type: 'string',
									default: '',
								},
								{
									displayName: 'Postal Code',
									name: 'postal_code',
									description: 'ZIP or postal code.',
									type: 'string',
									default: '',
								},
								{
									displayName: 'State',
									name: 'state',
									description: 'State, county, province, or region.',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				{
					displayName: 'Recipient Name',
					name: 'name',
					type: 'string',
					default: '',
				},
			],
		},
	],
};
