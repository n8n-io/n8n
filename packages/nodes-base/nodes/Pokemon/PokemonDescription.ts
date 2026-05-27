import type { INodeProperties } from 'n8n-workflow';

export const pokemonOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a Pokémon',
				description: 'Get a Pokémon by name or numeric ID',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many Pokémon',
				description: 'Get a list of Pokémon names and URLs',
			},
		],
		default: 'get',
	},
];

export const pokemonFields: INodeProperties[] = [
	// ─── Get: nameOrId ────────────────────────────────────────────────────────
	{
		displayName: 'Pokemon Name or ID',
		name: 'nameOrId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
			},
		},
		default: '',
		placeholder: 'e.g. pikachu or 25',
		description: 'Name (lowercase) or numeric ID. The node normalizes to lowercase automatically.',
	},
	// ─── Get: simplify ────────────────────────────────────────────────────────
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['get'],
			},
		},
		default: true,
		description:
			'Whether to return a simplified version instead of the raw data. Use Simplify for bulk operations — full data on large result sets may cause memory issues.',
	},
	// ─── Get Many: returnAll ──────────────────────────────────────────────────
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	// ─── Get Many: limit ──────────────────────────────────────────────────────
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 20,
		description:
			'Max number of results to return. Returns name and URL only — use Get for full details.',
	},
];
