import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardNotFoundError, boardResourceLocator } from '../../helpers/boardLocator';
import { safeJsonParse } from '../../helpers/json';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';

const properties: INodeProperties[] = [boardResourceLocator];

const displayOptions = {
	show: {
		resource: ['column'],
		operation: ['getColumns'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Shapes one Column: Get Many row — settings_str is parsed into a
 * `settings` object so expressions can address label maps etc. directly.
 * `rollup` carries the calculated capability (multi-level boards): its
 * presence marks a rollup column; null on classic boards and plain columns.
 */
export function formatColumnSchemaRow(column: IDataObject): IDataObject {
	let settings: unknown = null;
	if (typeof column.settings_str === 'string' && column.settings_str !== '') {
		const parsed = safeJsonParse(column.settings_str);
		if (parsed !== undefined) settings = parsed;
	}
	const capabilities = column.capabilities as
		| { calculated?: { function?: string; calculated_type?: string } | null }
		| null
		| undefined;
	return {
		id: column.id ?? null,
		title: column.title ?? null,
		type: column.type ?? null,
		description: column.description ?? null,
		settings: settings as IDataObject,
		rollup: (capabilities?.calculated as IDataObject | undefined) ?? null,
	};
}

export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject[]> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const data = await client.execute(
		`query ($ids: [ID!]) {
			boards(ids: $ids) {
				columns {
					id title type description settings_str
					capabilities { calculated { function calculated_type } }
				}
			}
		}`,
		itemIndex,
		{ ids: [boardId] },
	);
	const board = ((data.boards ?? []) as Array<{ columns?: IDataObject[] }>)[0];
	if (!board) throw boardNotFoundError(this.getNode(), boardId, itemIndex);
	return (board.columns ?? []).map((column) => formatColumnSchemaRow(column));
}
