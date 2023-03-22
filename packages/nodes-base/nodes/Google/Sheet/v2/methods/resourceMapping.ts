import type { ILoadOptionsFunctions } from 'n8n-core';
import type { IDataObject, ResourceMapperFields } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { GoogleSheet } from '../helpers/GoogleSheet';
import type { ResourceLocator } from '../helpers/GoogleSheets.types';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const { mode, value } = this.getNodeParameter('documentId', 0) as IDataObject;
	const fieldsToMatch = (this.getNodeParameter('columns.match', 0) as string[]) || [];
	const spreadsheetId = getSpreadsheetId(mode as ResourceLocator, value as string);

	const sheet = new GoogleSheet(spreadsheetId, this);
	let sheetWithinDocument = this.getNodeParameter('sheetName', undefined, {
		extractValue: true,
	}) as string;

	if (sheetWithinDocument === 'gid=0') {
		sheetWithinDocument = '0';
	}

	const sheetName = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	const sheetData = await sheet.getData(`${sheetName}!1:1`, 'FORMATTED_VALUE');

	if (sheetData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}
	const columns = sheet.testFilter(sheetData, 0, 0).filter((col) => col !== '');
	const columnData: ResourceMapperFields = {
		fields: columns.map((col) => ({
			id: col,
			displayName: col,
			match: fieldsToMatch.includes(col),
			required: false,
			defaultMatch: col === 'id',
			display: !col.startsWith('_'),
			type: 'string',
		})),
	};

	return columnData;
}
