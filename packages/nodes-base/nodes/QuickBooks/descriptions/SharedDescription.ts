export const lineProperty = {
	displayName: 'Line',
	name: 'Line',
	type: 'collection',
	placeholder: 'Add Line Item Property',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	displayOptions: {
		show: {
			resource: [
				'estimate',
				'invoice',
			],
			operation: [
				'create',
			],
		},
	},
	options: [
		{
			displayName: 'Type',
			name: 'DetailType',
			type: 'options',
			default: 'DescriptionOnlyLine',
			options: [
				{
					name: 'Description Only Line',
					value: 'DescriptionOnlyLine',
				},
				{
					name: 'Discount Line',
					value: 'DiscountLine',
				},
				{
					name: 'Group Line',
					value: 'GroupLine',
				},
				{
					name: 'Sales Item Line',
					value: 'SalesItemLine',
				},
				{
					name: 'Subtotal Line',
					value: 'SubTotalLine',
				},
			],
		},
		{
			displayName: 'Amount',
			name: 'amount',
			type: 'number',
			default: 0,
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			typeOptions: {
				alwaysOpenEditWindow: true,
			},
		},
		{
			displayName: 'Position',
			name: 'LineNum',
			type: 'number',
			default: 1,
		},
	],
};
