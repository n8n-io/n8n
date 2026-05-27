import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	POKEAPI_BASE_URL,
	pokemonApiRequest,
	pokemonApiRequestAllPages,
	simplifyPokemonData,
	validateNameOrId,
	clampLimit,
	type IPokemonDetailResponse,
	type IPokemonListResponse,
} from './GenericFunctions';
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
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'get') {
			for (let i = 0; i < items.length; i++) {
				try {
					const rawNameOrId = this.getNodeParameter('nameOrId', i) as string;
					const simplify = this.getNodeParameter('simplify', i, true) as boolean;
					const nameOrId = validateNameOrId(this, rawNameOrId, i);
					const url = `${POKEAPI_BASE_URL}/pokemon/${nameOrId}`;
					const responseData = await (pokemonApiRequest<IPokemonDetailResponse>).call(
						this,
						url,
						nameOrId,
					);
					const outputData = simplify ? simplifyPokemonData(responseData) : responseData;
					returnData.push(
						...this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray([outputData as IDataObject]),
							{ itemData: { item: i } },
						),
					);
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
		} else if (operation === 'getAll') {
			for (let i = 0; i < items.length; i++) {
				try {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					let results: IDataObject[];
					if (returnAll) {
						results = (await pokemonApiRequestAllPages.call(this)) as IDataObject[];
					} else {
						const limit = clampLimit(this.getNodeParameter('limit', i) as number);
						const response = await (pokemonApiRequest<IPokemonListResponse>).call(
							this,
							`${POKEAPI_BASE_URL}/pokemon?limit=${limit}&offset=0`,
						);
						results = response.results as IDataObject[];
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(results),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
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
		} else {
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
		}

		return [returnData];
	}
}
