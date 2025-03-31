import type { INodeProperties } from '../Interfaces';

const PREFIX = 'commonToolParameters_';
const FIELDS_ARRAY = [
	'optimizeResponse',
	'optimizedFields',
	'optimizedFieldOptions',
	'fieldPath',
	'optimizationType',
	'removedFields',
	'removedFieldsOptions',
	'excludeAllOtherFields',
	'cssSelector',
	'onlyContent',
	'elementsToOmit',
	'truncateResult',
	'maxLength',
] as const;

const FIELDS = Object.fromEntries(
	FIELDS_ARRAY.map((x) => [x, `${PREFIX}${x}` as const] as const),
) as { [key in (typeof FIELDS_ARRAY)[number]]: `${typeof PREFIX}${key}` };

const optimizationProps: INodeProperties[] = [
	{
		displayName: 'Selector (CSS)',
		name: FIELDS.cssSelector,
		type: 'string',
		description:
			'Select specific element (e.g. body) or multiple elements (e.g. div) of the chosen type in the response HTML.',
		placeholder: 'e.g. body',
		default: 'body',
		noDataExpression: true,
		displayOptions: {
			show: {
				[FIELDS.optimizationType]: ['html'],
			},
		},
	},
	{
		displayName: 'Return Only Content',
		name: FIELDS.onlyContent,
		type: 'boolean',
		default: false,
		description:
			'Whether to return only content of html elements, stripping html tags and attributes',
		hint: 'Uses less tokens and may be easier for model to understand',
		noDataExpression: true,
		displayOptions: {
			show: {
				[FIELDS.optimizationType]: ['html'],
			},
		},
	},
	{
		displayName: 'Elements To Omit',
		name: FIELDS.elementsToOmit,
		type: 'string',
		displayOptions: {
			show: {
				[FIELDS.optimizationType]: ['html'],
				[FIELDS.onlyContent]: [true],
			},
		},
		default: '',
		placeholder: 'e.g. img, .className, #ItemId',
		description: 'Comma-separated list of selectors that would be excluded when extracting content',
		noDataExpression: true,
	},
	{
		displayName: 'Truncate Result',
		name: FIELDS.truncateResult,
		type: 'boolean',
		default: false,
		hint: 'Helps save tokens',
		noDataExpression: true,
		displayOptions: {
			show: {
				[FIELDS.optimizationType]: ['text', 'html'],
			},
		},
	},
	{
		displayName: 'Max Result Characters',
		name: 'maxLength',
		type: 'number',
		default: 1000,
		typeOptions: {
			minValue: 1,
		},
		noDataExpression: true,
		displayOptions: {
			show: {
				[FIELDS.optimizationType]: ['text', 'html'],
				[FIELDS.truncateResult]: [true],
			},
		},
	},
];

export const commonToolParameters: INodeProperties[] = [
	{
		displayName: 'Optimize Response',
		name: FIELDS.optimizeResponse,
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description:
			'Whether to optimize the tool response to reduce amount of data passed to the LLM. This can lead to better result and reduce cost',
	},
	{
		displayName: 'Selected Fields',
		name: FIELDS.optimizedFields,
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Field',
		description: 'Fields to include and optimize',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				[FIELDS.optimizeResponse]: [true],
			},
		},
		options: [
			{
				displayName: 'What is this?',
				name: FIELDS.optimizedFieldOptions,
				values: [
					{
						displayName: 'Field Path',
						name: FIELDS.fieldPath,
						type: 'string',
						default: '',
						placeholder: 'data.myArray[0].myField',
						noDataExpression: true,
						description: 'The path to the field containing the data to optimize.',
					},
					{
						displayName: 'Optimization',
						name: FIELDS.optimizationType,
						type: 'options',
						default: 'none',
						description: 'TODO <docs to optimizations>',
						options: [
							{
								name: 'None',
								value: 'none',
							},
							{
								name: 'HTML',
								value: 'html',
							},
							{
								name: 'Text',
								value: 'text',
							},
						],
					},
					...optimizationProps,
				],
			},
		],
	},
	{
		displayName: 'Exclude All Other Fields',
		name: FIELDS.excludeAllOtherFields,
		type: 'boolean',
		noDataExpression: true,
		displayOptions: {
			show: {
				[FIELDS.optimizeResponse]: [true],
			},
		},
		default: true,
	},
	{
		displayName: 'Excluded Fields',
		name: FIELDS.removedFields,
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Field to Exclude',
		description: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				[FIELDS.optimizeResponse]: [true],
				[FIELDS.excludeAllOtherFields]: [false],
			},
		},
		options: [
			{
				displayName: 'But what is this?',
				name: FIELDS.removedFieldsOptions,
				values: [
					{
						displayName: 'Field Path',
						name: FIELDS.fieldPath,
						type: 'string',
						default: '',
						noDataExpression: true,
						placeholder: 'e.g. data.myArray[0].myFieldToRemove',
						description: 'The path to the field containing the data to remove.',
					},
				],
			},
		],
	},
];
