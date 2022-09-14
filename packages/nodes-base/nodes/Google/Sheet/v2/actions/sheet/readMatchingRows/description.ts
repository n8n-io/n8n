import { SheetProperties } from '../../../helper/GoogleSheets.types';
import { dataLocationOnSheet, outputDateFormatting, outputFormatting } from '../commonDescription';

export const sheetReadMatchingRowsDescription: SheetProperties = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column To Match On',
		name: 'columnToMatchOn',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['sheetName'],
			loadOptionsMethod: 'getSheetHeaderRow',
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
	},
	{
		displayName: 'Value To Match',
		name: 'valueToMatch',
		type: 'string',
		default: '',
		placeholder: 'anna@n8n.io',
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		description: 'The value to look for in column',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readMatchingRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		options: [
			...dataLocationOnSheet,
			...outputFormatting,
			...outputDateFormatting,
			{
				displayName: 'When Multiple Matches',
				name: 'whenMultipleMatches',
				type: 'options',
				default: 'returnFirstMatch',
				options: [
					{
						name: 'Return First Match',
						value: 'returnFirstMatch',
						description: 'Return only the first match',
					},
					{
						name: 'Return All Matches',
						value: 'returnAllMatches',
						description: 'Return all values that match',
					},
				],
				description:
					'By default only the first result gets returned, Set to "Return All Matches" to get multiple matches',
			},
		],
	},
];
