import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { boardResourceLocator } from '../../helpers/boardLocator';
import { resolveColumnValues } from '../../helpers/itemColumnValues';
import { itemResourceLocator } from '../../helpers/itemLocator';
import {
	BATTERY_VALUE_FRAGMENT,
	COLUMN_VALUES_CALCULATED_ARG,
	LINKED_VALUE_FRAGMENTS,
} from '../../helpers/multiLevel';
import type { MondayGraphQLClient } from '../../transport/MondayGraphQLClient';
import {
	columnsProperty,
	columnValuesJsonProperty,
	columnValuesModeProperty,
	createOptionsProperty,
} from '../common.description';

const properties: INodeProperties[] = [
	boardResourceLocator,
	itemResourceLocator,
	columnValuesModeProperty,
	columnsProperty,
	columnValuesJsonProperty,
	createOptionsProperty,
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['updateItem'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

/**
 * Item: Update — change_multiple_column_values via the same column builder
 * as Create; the mapper additionally exposes the name column for renames.
 */
export async function execute(
	this: IExecuteFunctions,
	client: MondayGraphQLClient,
	itemIndex: number,
): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const itemId = this.getNodeParameter('itemId', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const createOptions = this.getNodeParameter('createOptions', itemIndex, {}) as IDataObject;
	const columnValues = await resolveColumnValues.call(this, itemIndex, boardId);

	if (!columnValues || Object.keys(columnValues).length === 0) {
		throw new NodeOperationError(this.getNode(), 'Set at least one column value to update', {
			itemIndex,
		});
	}

	const data = await client.execute(
		`mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!, $createLabels: Boolean) {
			change_multiple_column_values(
				board_id: $boardId,
				item_id: $itemId,
				column_values: $columnValues,
				create_labels_if_missing: $createLabels
			) {
				id
				name
				url
				state
				board { id name }
				group { id title }
				column_values(${COLUMN_VALUES_CALCULATED_ARG}) { id type text value ${BATTERY_VALUE_FRAGMENT} ${LINKED_VALUE_FRAGMENTS} }
			}
		}`,
		itemIndex,
		{
			boardId,
			itemId,
			columnValues: JSON.stringify(columnValues),
			createLabels: createOptions.createLabelsIfMissing === true,
		},
	);

	return (data.change_multiple_column_values ?? {}) as IDataObject;
}
