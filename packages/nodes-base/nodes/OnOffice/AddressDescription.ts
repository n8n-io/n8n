import { INodeProperties } from 'n8n-workflow';

type FilterOperator =
	| 'is'
	| 'or'
	| 'equal'
	| 'greater'
	| 'less'
	| 'greaterequal'
	| 'lessequal'
	| 'notequal'
	| 'between'
	| 'like'
	| 'notlike'
	| 'in'
	| 'notin';

export type OnOfficeFilterConfiguration = {
	filter: Array<{
		field: string;
		operations: { operation: Array<{ operator: FilterOperator; value: string }> };
	}>;
};
export interface OnOfficeAddressReadAdditionalFields {
	recordIds?: string[];
	filterId?: number;
	filters?: OnOfficeFilterConfiguration;
	limit?: number;
	offset?: number;
	sortBy?: string;
	order?: 'ASC' | 'DESC';
	formatOutput?: boolean;
	language?: 'DEU';
	countryIsoCodeType?: '' | 'ISO-3166-2' | 'ISO-3166-3';
}

export const addressOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['address'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an address',
			},
			{
				name: 'Read',
				value: 'read',
				description: 'Read an address',
			},
			{
				name: 'Edit',
				value: 'edit',
				description: 'Edit an address',
			},
		],
		default: 'read',
		description: 'The operation to perform.',
	},
];

export const addressFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                address:read                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Data',
		name: 'data',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['address'],
				operation: ['read'],
			},
		},
		options: [
			{
				name: 'phone',
				value: 'phone',
				description: 'All phonebook entries except with type “mobile”',
			},
			{
				name: 'mobile',
				value: 'mobile',
				description: 'All phone book entries with type “mobile”',
			},
			{
				name: 'fax',
				value: 'fax',
				description: 'All phone book entries with type “fax”',
			},
			{
				name: 'email',
				value: 'email',
				description: 'All phone book entries with type “email”',
			},
			{
				name: 'defaultphone',
				value: 'defaultphone',
				description: 'Like phone, but only returns the record marked as default',
			},
			{
				name: 'defaultfax',
				value: 'defaultfax',
				description: 'Like fax, but only returns the record marked as default',
			},
			{
				name: 'defaultemail',
				value: 'defaultemail',
				description: 'Like email, but only returns the record marked as default',
			},
			{
				name: 'imageUrl',
				value: 'imageUrl',
				description: 'Image URL (pass photo) of the address',
			},
		],
		default: [],
		description: 'The data fields to fetch',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['address'],
				operation: ['read'],
			},
		},
		options: [
			{
				displayName: 'Record IDs',
				name: 'recordIds',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description: 'Can be used if one or more than one record should be read, but not all',
			},
			{
				displayName: 'Filter ID',
				name: 'filterId',
				type: 'number',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				default: 0,
				description: 'Restrict the selection of address data records by a existing filter',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				placeholder: 'Add Filter on new field',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter the results by fields.',
				options: [
					{
						name: 'filter',
						displayName: 'Filter',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description:
									'The field to filter by. The special fields listed above such as phone, email, defaultmail etc. cannot be queried by filter, but "Email" and "Telefon1" will work.',
							},
							{
								displayName: 'Filter operation',
								name: 'operations',
								placeholder: 'Add operation',
								type: 'fixedCollection',
								default: {},
								typeOptions: {
									multipleValues: true,
								},
								description: '',
								options: [
									{
										name: 'operation',
										displayName: 'Filter operation',
										values: [
											{
												displayName: 'Operator',
												name: 'operator',
												type: 'options',
												options: [
													{
														name: 'is',
														value: 'is',
													},
													{
														name: 'or',
														value: 'or',
													},
													{
														name: '=',
														value: 'equal',
													},
													{
														name: '>',
														value: 'greater',
													},
													{
														name: '<',
														value: 'less',
													},
													{
														name: '>=',
														value: 'greaterequal',
													},
													{
														name: '<=',
														value: 'lessequal',
													},
													{
														name: '<>',
														value: 'notequal',
														description: 'Not equal',
													},
													{
														name: 'between',
														value: 'between',
													},
													{
														name: 'like',
														value: 'like',
													},
													{
														name: 'not like',
														value: 'notlike',
													},
													{
														name: 'in',
														value: 'in',
													},
													{
														name: 'not in',
														value: 'notin',
													},
												],
												default: 'equal',
												description: 'The SQL filter operator',
											},
											{
												displayName: 'Value',
												name: 'value',
												type: 'string',
												displayOptions: {
													hide: {
														operator: ['between', 'in', 'notin'],
													},
												},
												default: '',
												description: 'The value which should be applied to the filtering',
											},
											{
												displayName: 'Values',
												name: 'values',
												type: 'string',
												typeOptions: {
													multipleValues: true,
												},
												displayOptions: {
													show: {
														operator: ['in', 'notin'],
													},
												},
												default: '',
												description: 'The values which should be applied to the filtering',
											},
											{
												displayName: 'Start',
												name: 'start',
												type: 'string',
												displayOptions: {
													show: {
														operator: ['between'],
													},
												},
												default: '',
												description: 'The smallest value',
											},
											{
												displayName: 'End',
												name: 'end',
												type: 'string',
												displayOptions: {
													show: {
														operator: ['between'],
													},
												},
												default: '',
												description: 'The biggest value',
											},
										],
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 500,
					numberPrecision: 0,
				},
				default: 20,
				description: 'Maximum number of records in the list',
			},
			{
				displayName: 'List offset',
				name: 'offset',
				type: 'number',
				typeOptions: {
					minValue: 0,
					numberPrecision: 0,
				},
				default: 0,
				description:
					'Offset of the list, that means from which data record onwards the list should be output',
			},
			{
				displayName: 'Sort by',
				name: 'sortBy',
				type: 'string',
				default: '',
				description: 'Field to sort by.',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASC',
					},
					{
						name: 'Descending',
						value: 'DESC',
					},
				],
				default: '',
				description: 'Sorting order',
			},
			{
				//TODO: Figure out what this does
				displayName: 'Format output',
				name: 'formatOutput',
				type: 'boolean',
				default: false,
				description: 'Enable formatted output',
			},
			{
				//TODO: Figure out what this does
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Output language',
			},
			{
				displayName: 'Country format',
				name: 'countryIsoCodeType',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: '',
					},
					{
						name: 'ISO-3166-2',
						value: 'ISO-3166-2',
					},
					{
						name: 'ISO-3166-3',
						value: 'ISO-3166-3',
					},
				],
				default: '',
				description:
					'Causes the field "Land" to be displayed as a ISO-3166-2 or ISO-3166-3 country code',
			},
		],
	},
];
