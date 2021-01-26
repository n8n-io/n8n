export const createlineProperty = (resource: string) => ({
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
				resource,
			],
			operation: [
				'create',
			],
		},
	},
	options: [
		{
			displayName: 'Detail Type',
			name: 'DetailType',
			type: 'options',
			default: 'DescriptionOnlyLine',
			options: [
				{
					name: 'Description Only',
					value: 'DescriptionOnly',
				},
				{
					name: 'Discount Line',
					value: 'DiscountLineDetail',
				},
				{
					name: 'Group Line',
					value: 'GroupLineDetail',
				},
				{
					name: 'Sales Item Line',
					value: 'SalesItemLineDetail',
				},
				{
					name: 'Subtotal Line',
					value: 'SubTotalLineDetail',
				},
			],
		},
		{
			displayName: 'Amount',
			name: 'Amount',
			type: 'number',
			default: 0,
		},
		{
			displayName: 'Description',
			name: 'Description',
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
});
