import type { INodeProperties } from 'n8n-workflow';

export const worksheetFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 worksheet:append                           */
	/* -------------------------------------------------------------------------- */

	/* -------------------------------------------------------------------------- */
	/*                        worksheet: clear                                    */
	/* -------------------------------------------------------------------------- */

	/* -------------------------------------------------------------------------- */
	/*                                 worksheet:getAll                           */
	/* -------------------------------------------------------------------------- */

	/* -------------------------------------------------------------------------- */
	/*                                 worksheet:getContent                       */
	/* -------------------------------------------------------------------------- */

	/* -------------------------------------------------------------------------- */
	/*                                 worksheet:updateRange                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'define',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMap',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'define',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Raw',
				value: 'raw',
				description: 'Send raw data as JSON',
			},
			{
				name: 'Nothing',
				value: 'nothing',
				description: 'Do not send anything',
			},
		],
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
			},
		},
	},
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'define',
		options: [
			{
				name: 'Auto-Map Input Data to Columns',
				value: 'autoMap',
				description: 'Use when node input properties match destination column names',
			},
			{
				name: 'Map Each Column Below',
				value: 'define',
				description: 'Set the value for each destination column',
			},
			{
				name: 'Nothing',
				value: 'nothing',
				description: 'Do not send anything',
			},
		],
		displayOptions: {
			show: {
				operation: ['upsert'],
				resource: ['worksheet'],
			},
		},
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		default: '',
		required: true,
		placeholder: 'e.g. [["Hello", "100"],["1/1/2016", null]]',
		description:
			'Raw values for the specified range as array of string arrays in JSON format. Should match specified range.',
		displayOptions: {
			show: {
				operation: ['updateRange'],
				resource: ['worksheet'],
				dataMode: ['raw'],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased, n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column to match on',
		name: 'columnToMatchOn',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['worksheet.value', 'workbook.value', 'range'],
			loadOptionsMethod: 'getWorksheetColumnRow',
		},
		default: '',
		hint: "Used to find the correct row to update. Doesn't get changed.",
		displayOptions: {
			show: {
				operation: ['updateRange', 'upsert'],
				resource: ['worksheet'],
				dataMode: ['autoMap', 'define'],
			},
		},
	},
	{
		displayName: 'Value of Column to Match On',
		name: 'valueToMatchOn',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['updateRange', 'upsert'],
				resource: ['worksheet'],
				dataMode: ['define'],
			},
		},
	},
	{
		displayName: 'Values to Send',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['updateRange', 'upsert'],
				resource: ['worksheet'],
				dataMode: ['define'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Field',
				name: 'values',
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Column',
						name: 'column',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsDependsOn: ['columnToMatchOn'],
							loadOptionsMethod: 'getWorksheetColumnRowSkipColumnToMatchOn',
						},
						default: '',
					},
					{
						displayName: 'Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				displayOptions: {
					show: {
						'/dataMode': ['autoMap', 'define'],
					},
				},
				placeholder: 'e.g. A1:B2',
				default: '',
				description: 'The sheet range to read the data from specified using a A1-style notation',
				hint: 'First row must contain column names. Leave blank for entire worksheet.',
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'string',
				displayOptions: {
					show: {
						'/dataMode': ['raw'],
					},
					hide: {
						'/operation': ['updateRange'],
					},
				},
				placeholder: 'e.g. A1:B2',
				default: '',
				description: 'The sheet range to read the data from specified using a A1-style notation',
				hint: 'Leave blank for entire worksheet',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-boolean
				default: 0,
				description:
					'Whether the data should be returned RAW instead of parsed into keys according to their header',
			},
			{
				displayName: 'Data Property',
				name: 'dataProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						rawData: [true],
					},
				},
				description: 'The name of the property into which to write the RAW data',
			},
			{
				displayName: 'Update All Matches',
				name: 'updateAll',
				type: 'boolean',
				default: false,
				description: 'Whether to update all matching rows or just the first match',
			},
		],
		displayOptions: {
			show: {
				operation: ['updateRange', 'upsert'],
				resource: ['worksheet'],
			},
		},
	},
];
