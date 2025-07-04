import type { type IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { fieldsToInclude, returnAllOrLimit } from '../../descriptions';
import type { type IOdooFilterOperations, OdooCredentialsInterface } from '../../GenericFunctions';
import { odooHTTPRequest, processBasicFilters, processCustomFilters } from '../../GenericFunctions';

export const basicFilter: INodeProperties[] = [
	{
		displayName: 'Simple Filter (Search Domain Combined Using &)',
		name: 'basicFilter',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Search Domain',
		},
		description:
			'Add search domains combined using &. Learn more in the <a href="https://www.odoo.com/documentation/18.0/developer/reference/backend/orm.html?highlight=search#search-domains" target="_blank">Odoo documentation</a>.',
		placeholder: 'Add Search Domain',
		default: {},
		displayOptions: {
			show: {
				resource: ['custom'],
				operation: ['getAll'],
				customFilterToggle: [false],
			},
		},
		options: [
			{
				displayName: 'Search Domain',
				name: 'searchDomain',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldName',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsDependsOn: ['customResource'],
							loadOptionsMethod: 'getModelFields',
						},
					},
					{
						displayName: 'Operator',
						name: 'operator',
						type: 'options',
						default: 'equal',
						description: 'Specify an operator',
						options: [
							{
								name: '!=',
								value: 'notEqual',
								description: 'Not equals to',
							},
							{
								name: '<',
								value: 'lesserThan',
								description: 'Less than',
							},
							{
								name: '<=',
								value: 'lesserOrEqualThan',
								description: 'Less than or equal to',
							},
							{
								name: '=',
								value: 'equal',
								description: 'Equals to',
							},
							{
								name: '=?',
								value: 'unsetOrEqual',
								description:
									'Unset or equals to (returns true if value is either None or False, otherwise behaves like =)',
							},
							{
								name: '=Ilike',
								value: 'equalIlike',
								description: 'Case insensitive =like',
							},
							{
								name: '=Like',
								value: 'equalLike',
								description:
									'Matches field_name against the value pattern. An underscore _ in the pattern matches any single character; a percent sign % matches any string of zero or more characters.',
							},
							{
								name: '>',
								value: 'greaterThan',
								description: 'Greater than',
							},
							{
								name: '>=',
								value: 'greaterOrEqualThan',
								description: 'Greater than or equal to',
							},
							{
								name: 'Any',
								value: 'any',
								description:
									'Matches if any record in the relationship traversal through field_name (Many2one, One2many, or Many2many) satisfies the provided domain value',
							},
							{
								name: 'Child_of',
								value: 'childOf',
								description:
									'Is a child (descendant) of a value record. Takes the semantics of the model into account (i.e., following the relationship field named by _parent_name).',
							},
							{
								name: 'Ilike',
								value: 'ilike',
								description: 'Case insensitive like',
							},
							{
								name: 'In',
								value: 'in',
								description:
									'Is equal to any of the items from value. Value should be a list of items.',
							},
							{
								name: 'Like',
								value: 'like',
								description:
									'Matches field_name against the %value% pattern. Similar to =like but wraps value with % before matching.',
							},
							{
								name: 'Not Any',
								value: 'notAny',
								description:
									'Matches if no record in the relationship traversal through field_name (Many2one, One2many, or Many2many) satisfies the provided domain value',
							},
							{
								name: 'Not Ilike',
								value: 'notIlike',
								description: 'Case insensitive not like',
							},
							{
								name: 'Not In',
								value: 'notIn',
								description: 'Is unequal to all of the items from value',
							},
							{
								name: 'Not Like',
								value: 'notLike',
								description: 'Doesn’t match against the %value% pattern',
							},
							{
								name: 'Parent_of',
								value: 'parentOf',
								description:
									'Is a parent (ascendant) of a value record. Takes the semantics of the model into account (i.e., following the relationship field named by _parent_name).',
							},
						],
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Specify value for comparison',
					},
				],
			},
		],
	},
];

export const customFilterToggle: INodeProperties[] = [
	{
		displayName: 'Custom Filter',
		name: 'customFilterToggle',
		type: 'boolean',
		description:
			'Whether to filter by domain using JSON syntax ["&" ["attribute", "=", false], ["attribute2", "=", "test"]]',
		default: false,
		required: true,
	},
];

export const customFilter: INodeProperties[] = [
	{
		displayName: 'Custom Filter',
		name: 'customFilter',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		description:
			'Add search domains combined using &. Learn more in the <a href="https://www.odoo.com/documentation/18.0/developer/reference/backend/orm.html?highlight=search#search-domains" target="_blank">Odoo documentation</a>.',
		placeholder:
			'[\n' +
			"    ('name', '=', 'ABC'),\n" +
			"    '|',\n" +
			"        ('phone','ilike','7620'),\n" +
			"        ('mobile', 'ilike', '7620')\n" +
			']',
		default: '',
		displayOptions: {
			show: {
				customFilterToggle: [true],
			},
		},
	},
];

export const properties: INodeProperties[] = [
	...returnAllOrLimit,
	...fieldsToInclude,
	...customFilterToggle,
	...basicFilter,
	...customFilter,
];

const displayOptions = {
	show: {
		resource: ['custom'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
	credentials: OdooCredentialsInterface,
	customResource: string,
) {
	const returnAll = this.getNodeParameter('returnAll', index);
	const options = this.getNodeParameter('options', index);
	const fields = (options.fieldsList as IDataObject[]) || [];
	const customFilterToggle = this.getNodeParameter('customFilterToggle', index);

	const domain = customFilterToggle
		? processCustomFilters(this.getNodeParameter('customFilter', index, '') as string) || []
		: processBasicFilters(
				this.getNodeParameter('basicFilter', index, {}) as IOdooFilterOperations,
			) || [];

	if (returnAll) {
		return await odooHTTPRequest.call(this, credentials, customResource, 'search_read', [], {
			domain,
			fields,
			offset: 0,
			limit: 0,
		});
	} else {
		const limit = this.getNodeParameter('limit', index, 0);
		return await odooHTTPRequest.call(this, credentials, customResource, 'search_read', [], {
			domain,
			fields,
			offset: 0,
			limit,
		});
	}
}
