import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { pokemonFields, pokemonOperations } from './PokemonDescription';

export class Pokemon implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pokemon',
		name: 'pokemon',
		icon: 'file:pokemon.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": Pokemon"}}',
		description:
			'Get Pokémon data from PokéAPI. Get retrieves full details (stats, types, abilities, sprites). Get Many returns a list of names and URLs.',
		defaults: {
			name: 'Pokemon',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [...pokemonOperations, ...pokemonFields],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		throw new NodeOperationError(this.getNode(), 'Not yet implemented');
	}
}
