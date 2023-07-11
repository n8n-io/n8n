import type { INodeProperties } from 'n8n-workflow';

export const sortCollection: INodeProperties = {
	displayName: 'Sort',
	name: 'sort',
	type: 'fixedCollection',
	placeholder: 'Add Sort Rule',
	default: {},
	typeOptions: {
		multipleValues: true,
	},
	options: [
		{
			displayName: 'Fields',
			name: 'fields',
			values: [
				{
					displayName: 'Field',
					name: 'field',
					type: 'string',
					default: '',
					requiresDataPath: 'single',
				},
				{
					displayName: 'Direction',
					name: 'direction',
					type: 'options',
					options: [
						{
							name: 'Ascending',
							value: 'asc',
						},
						{
							name: 'Descending',
							value: 'desc',
						},
					],
					default: 'asc',
				},
			],
		},
	],
};
