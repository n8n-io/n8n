import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { buildBoardFieldSelection } from '../../helpers/boardFields';
import { boardNotFoundError, boardResourceLocator } from '../../helpers/boardLocator';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import { INCLUDE_COMPLETE_BOARD_DATA_OPTION } from '../common.description';

const properties: INodeProperties[] = [
	boardResourceLocator,
	{
		displayName: 'Options',
		name: 'getBoardOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [INCLUDE_COMPLETE_BOARD_DATA_OPTION],
	},
];

const displayOptions = {
	show: {
		resource: ['board'],
		operation: ['getBoard'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Board: Get — one board by ID. Queries with state: all so archived and
 * deleted boards still resolve (the API defaults to active only, which made
 * archived boards look nonexistent). Output is the unwrapped board object.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const options = this.getNodeParameter('getBoardOptions', itemIndex, {}) as IDataObject;

	const data = await client.execute(
		`query ($ids: [ID!]) {
			boards(ids: $ids, state: all) {
				${buildBoardFieldSelection({
					includeStructure: true,
					includeCompleteData: options.includeCompleteData === true,
				})}
			}
		}`,
		itemIndex,
		{ ids: [boardId] },
	);

	const boards = (data.boards ?? []) as IDataObject[];
	if (boards.length === 0) {
		throw boardNotFoundError(this.getNode(), boardId, itemIndex);
	}
	return boards[0];
}
