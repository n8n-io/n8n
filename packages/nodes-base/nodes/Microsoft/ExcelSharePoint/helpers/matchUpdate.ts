import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { generatePairedItemData, processJsonInput } from '@utils/utilities';

import type { ExcelResponse, UpdateSummary } from '../../Excel/v2/helpers/interfaces';
// Reused from the OneDrive node so matching, range math, and output shaping cannot drift
import {
	checkRange,
	parseAddress,
	prepareOutput,
	updateByAutoMaping,
	updateByDefinedValues,
} from '../../Excel/v2/helpers/utils';
import { resolveWorkbookRoot, validatePathSegment } from './utils';
import { microsoftApiRequest } from '../transport';

type MatchUpdateOptions = {
	appendAfterSelectedRange?: boolean;
	fields?: string;
	rawData?: boolean;
	dataProperty?: string;
	updateAll?: boolean;
};

/**
 * The shared core of Sheet — Update and Sheet — Append-or-Update: read the
 * range (or used range), match rows on the chosen column, write the whole
 * batch back in one PATCH. `appendUnmatched` is the only difference between
 * the two operations. The range is read with GET — the OneDrive node reads it
 * via an empty PATCH, which happens to work but isn't the documented route.
 */
export async function executeMatchUpdate(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	appendUnmatched: boolean,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	try {
		const options = this.getNodeParameter('options', 0, {}) as MatchUpdateOptions;
		const rawData = options.rawData ?? false;
		const dataProperty = options.dataProperty ?? 'data';
		const updateAll = options.updateAll ?? false;

		const workbookRoot = await resolveWorkbookRoot.call(this, 0);
		const worksheetId = validatePathSegment(
			this.getNode(),
			'Sheet',
			this.getNodeParameter('worksheet', 0, '', { extractValue: true }) as string,
		);
		const sheetPath = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(worksheetId)}`;

		let range = (this.getNodeParameter('range', 0, '') as string).trim();
		checkRange(this.getNode(), range);

		const dataMode = this.getNodeParameter('dataMode', 0) as string;

		let worksheetData: IDataObject = {};
		if (range !== '' && dataMode !== 'raw') {
			worksheetData = await microsoftApiRequest.call(
				this,
				'GET',
				`${sheetPath}/range(address='${range}')`,
			);
		}
		if (range === '') {
			const qs: IDataObject = {};
			if (dataMode === 'raw') {
				qs.$select = 'address';
			}
			worksheetData = await microsoftApiRequest.call(this, 'GET', `${sheetPath}/usedRange`, {}, qs);
			range = String(worksheetData.address).split('!')[1];
		}

		if (dataMode === 'raw') {
			const rawRows = processJsonInput(this.getNodeParameter('data', 0), 'Data') as string[][];
			const rawQs: IDataObject = {};
			if (rawData && options.fields) {
				rawQs.$select = options.fields;
			}
			const responseData = await (microsoftApiRequest<ExcelResponse>).call(
				this,
				'PATCH',
				`${sheetPath}/range(address='${range}')`,
				{ values: rawRows },
				rawQs,
			);
			returnData.push(
				...prepareOutput.call(this, this.getNode(), responseData, { rawData, dataProperty }),
			);
			return returnData;
		}

		const sheetValues = worksheetData.values as string[][] | undefined;
		// Update needs at least one data row under the header; append-or-update
		// can still append against a header-only range — the OneDrive node's
		// two thresholds, preserved exactly.
		const minRows = appendUnmatched ? 1 : 2;
		if (sheetValues === undefined || sheetValues.length < minRows) {
			throw new NodeOperationError(
				this.getNode(),
				'No data found in the specified range, mapping not possible, you can use raw mode instead to update selected range',
			);
		}

		let updateSummary: UpdateSummary = { updatedData: [], updatedRows: [], appendData: [] };
		if (dataMode === 'define') {
			updateSummary = updateByDefinedValues.call(this, items.length, sheetValues, updateAll);
		} else {
			const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0) as string;
			if (!items.some(({ json }) => json[columnToMatchOn] !== undefined)) {
				throw new NodeOperationError(
					this.getNode(),
					`Any item in input data contains column '${columnToMatchOn}', that is selected to match on`,
				);
			}
			updateSummary = updateByAutoMaping(items, sheetValues, columnToMatchOn, updateAll);
		}

		const appendAfterSelectedRange = options.appendAfterSelectedRange ?? false;

		// Trailing all-empty rows would push appended rows further down — trimmed
		// only on the append-or-update path, where the OneDrive node trims; its
		// Update never trims, and Update's write range is never recomputed, so a
		// trim there would make the values no longer match the range's dimensions.
		if (appendUnmatched && !appendAfterSelectedRange && updateSummary.updatedData.length) {
			for (let i = updateSummary.updatedData.length - 1; i >= 0; i--) {
				const row = updateSummary.updatedData[i];
				if (row.every((cell) => cell === '' || cell === undefined || cell === null)) {
					updateSummary.updatedData.pop();
				} else {
					break;
				}
			}
		}

		if (appendUnmatched && updateSummary.appendData.length) {
			const appendValues: string[][] = [];
			const columnsRow = sheetValues[0];
			for (const [index, item] of updateSummary.appendData.entries()) {
				appendValues.push(columnsRow.map((column) => item[column] as string));
				updateSummary.updatedRows.push(index + updateSummary.updatedData.length);
			}
			updateSummary.updatedData = updateSummary.updatedData.concat(appendValues);

			const { cellFrom, cellTo } = parseAddress(range);
			let lastRow = cellTo.row;
			if (!appendAfterSelectedRange) {
				const usedRange = await microsoftApiRequest.call(
					this,
					'GET',
					`${sheetPath}/usedRange`,
					{},
					{
						$select: 'address',
					},
				);
				lastRow = parseAddress(String(usedRange.address)).cellTo.row;
			}
			range = `${cellFrom.value}:${cellTo.column}${Number(lastRow) + appendValues.length}`;
		}

		// Fields shows whenever RAW Data output is on, regardless of data mode — so it
		// must shape this response too (the OneDrive node silently ignores it here)
		const patchQs: IDataObject = {};
		if (rawData && options.fields) {
			patchQs.$select = options.fields;
		}
		const responseData = await (microsoftApiRequest<ExcelResponse>).call(
			this,
			'PATCH',
			`${sheetPath}/range(address='${range}')`,
			{ values: updateSummary.updatedData },
			patchQs,
		);

		returnData.push(
			...prepareOutput.call(this, this.getNode(), responseData, {
				updatedRows: updateSummary.updatedRows,
				rawData,
				dataProperty,
			}),
		);
	} catch (error) {
		if (!this.continueOnFail()) throw error;
		const message = error instanceof Error ? error.message : String(error);
		returnData.push(
			...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: message }), {
				itemData: generatePairedItemData(items.length),
			}),
		);
	}

	return returnData;
}
