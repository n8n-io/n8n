import { type IDataObject, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { extractMappedValues, fetchColumnTypes } from './columnMapper';
import { buildColumnValues } from './columnValueMappers';

/**
 * Resolves the column_values object shared by Item: Create and Item: Update —
 * either the typed column mapper (friendly per-type inputs) or a raw
 * API-format JSON object. Returns undefined when nothing was set.
 */
export async function resolveColumnValues(
	this: IExecuteFunctions,
	itemIndex: number,
	boardId: string,
): Promise<IDataObject | undefined> {
	const mode = this.getNodeParameter('columnValuesMode', itemIndex) as string;

	if (mode === 'json') {
		const raw = this.getNodeParameter('columnValuesJson', itemIndex, '{}');
		if (typeof raw === 'object' && raw !== null) {
			return raw as IDataObject;
		}
		if (typeof raw === 'string' && raw.trim() !== '' && raw.trim() !== '{}') {
			try {
				return JSON.parse(raw) as IDataObject;
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					'Column Values (JSON) must be a valid JSON object keyed by column ID',
					{ itemIndex },
				);
			}
		}
		return undefined;
	}

	const mapped = extractMappedValues(this.getNodeParameter('columns', itemIndex, {}));
	if (Object.keys(mapped).length === 0) return undefined;
	const columnTypes = await fetchColumnTypes(this, boardId, itemIndex);
	return buildColumnValues(mapped, columnTypes, { timezone: this.getTimezone() });
}
