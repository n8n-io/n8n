import { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { OnOfficeReadAdditionalFieldName, OnOfficeResource } from '../interfaces';
import { commonReadDescription } from './CommonReadDescription';

export const generateReadDataFieldsDescription = ({
	resource,
	specialFields,
}: {
	resource: OnOfficeResource;
	specialFields?: INodePropertyOptions[];
}) =>
	[
		{
			displayName: 'Data fields',
			name: 'data',
			type: 'string',
			required: true,
			typeOptions: {
				multipleValues: true,
			},
			default: [],
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['read'],
				},
			},
			description: 'The data fields to fetch',
		},
		...(specialFields
			? [
					{
						displayName: 'Special data fields',
						name: 'specialData',
						type: 'multiOptions',
						displayOptions: {
							show: {
								resource: [resource],
								operation: ['read'],
							},
						},
						options: specialFields,
						default: [],
						description:
							'Some data fields have special meaning. Select the fields you want to include.',
					},
			]
			: []),
	] as INodeProperties[];

export const generateReadAdditionalFieldsDescription = ({
	resource,
	additionalFields,
}: {
	resource: OnOfficeResource;
	additionalFields?: INodeProperties[];
}) =>
	[
		{
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['read'],
				},
			},
			options: [...commonReadDescription, ...(additionalFields || [])],
		},
	] as INodeProperties[];
