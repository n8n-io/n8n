import {INodeProperties} from 'n8n-workflow';

export const operationFields = [
		// ----------------------------------
		//             shared
		// ----------------------------------

		{
				displayName: 'Table',
				name: 'tableName',
				type: 'options',
				placeholder: 'Name of table',
				required: true,
				typeOptions: {
						// nodelinter-ignore-next-line NON_EXISTENT_LOAD_OPTIONS_METHOD
						loadOptionsMethod: 'getTableNames',
				},
				// nodelinter-ignore-next-line WRONG_DEFAULT_FOR_OPTIONS_TYPE_PARAM
				default: '',
				description: 'The name of SeaTable table to access',
		},

		// ----------------------------------
		//             list
		// ----------------------------------
		{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
						show: {
								operation: [
										'list',
								],
						},
				},
				default: true,
				description: 'Whether to return all results or only up to a given limit',
		},
		{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
						show: {
								operation: [
										'list',
								],
								returnAll: [
										false,
								],
						},
				},
				typeOptions: {
						minValue: 1,
						maxValue: 100,
				},
				default: 50,
				description: 'How many results to return',
		},
		{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
						show: {
								operation: [
										'list',
								],
						},
				},
				default: {},
				options: [
						{
								displayName: 'Columns:',
								name: 'columnNames',
								type: 'string',
								default: '',
								// nodelinter-ignore-next-line TECHNICAL_TERM_IN_PARAM_DESCRIPTION
								description: 'Additional columns to be included. <br><br>By default the standard (always first) column is returned, this field allows to add one or more additional.<br><br><ul><li>Multiple can be separated by comma. Example: <samp>Title,Surname</samp>.',
						},
				],
		},

		// ----------------------------------
		//             append
		// ----------------------------------
		{
				displayName: 'Data to Send',
				name: 'dataToSend',
				type: 'options',
				options: [
						{
								name: 'Auto-Map Input Data to Columns',
								value: 'autoMapInputData',
								description: 'Use when node input properties match destination column names',
						},
						{
								name: 'Define Below for Each Column',
								value: 'defineBelow',
								description: 'Set the value for each destination column',
						},
				],
				displayOptions: {
						show: {
								operation: [
										'append',
								],
						},
				},
				default: 'defineBelow',
				description: 'Whether to insert the input data this node receives in the new row',
		},
		{
				displayName: 'Inputs to Ignore',
				name: 'inputsToIgnore',
				type: 'string',
				displayOptions: {
						show: {
								operation: [
										'append',
								],
								dataToSend: [
										'autoMapInputData',
								],
						},
				},
				default: '',
				description: 'List of input properties to avoid sending, separated by commas. Leave empty to send all properties.',
				placeholder: 'Enter properties...',
		},
		{
				displayName: 'Columns to Send',
				name: 'columnsUi',
				placeholder: 'Add Column',
				type: 'fixedCollection',
				typeOptions: {
						multipleValueButtonText: 'Add Column to Send',
						multipleValues: true,
				},
				options: [
						{
								displayName: 'Column',
								name: 'columnValues',
								values: [
										{
												displayName: 'Column Name',
												name: 'columnName',
												type: 'options',
												typeOptions: {
														loadOptionsDependsOn: [
																'table',
														],
														// nodelinter-ignore-next-line NON_EXISTENT_LOAD_OPTIONS_METHOD
														loadOptionsMethod: 'getTableUpdateAbleColumns',
												},
												// nodelinter-ignore-next-line WRONG_DEFAULT_FOR_OPTIONS_TYPE_PARAM
												default: '',
												description: 'Name of the column',
										},
										{
												displayName: 'Column Value',
												name: 'columnValue',
												type: 'string',
												default: '',
												description: 'Value of the column',
										},
								],
						},
				],
				displayOptions: {
						show: {
								operation: [
										'append',
								],
								dataToSend: [
										'defineBelow',
								],
						},
				},
				default: {},
				description: 'Add destination column with its value',
		},

] as INodeProperties[];
