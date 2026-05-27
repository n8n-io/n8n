import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { clampLimit, pokemonApiRequest, pokemonApiRequestAllPages } from './GenericFunctions';
import type { IPokemonListResponse } from './GenericFunctions';
import { pokemonFields, pokemonOperations } from './PokemonDescription';

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

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
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					let results: IDataObject[];
					if (returnAll) {
						results = (await pokemonApiRequestAllPages.call(this)) as unknown as IDataObject[];
					} else {
						const limit = clampLimit(this.getNodeParameter('limit', i) as number);
						const response = (await pokemonApiRequest.call(
							this,
							`${POKEAPI_BASE_URL}/pokemon?limit=${limit}&offset=0`,
						)) as IPokemonListResponse;
						results = response.results as unknown as IDataObject[];
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(results),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
