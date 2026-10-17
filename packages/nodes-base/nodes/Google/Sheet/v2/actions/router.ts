import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	UnexpectedError,
} from 'n8n-workflow';

import * as sheet from './sheet/Sheet.resource';
import * as spreadsheet from './spreadsheet/SpreadSheet.resource';
import { GoogleSheet } from '../helpers/GoogleSheet';
import type { GoogleSheets, ResourceLocator } from '../helpers/GoogleSheets.types';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';

interface SheetTarget {
	spreadsheetId: string;
	sheetMode?: ResourceLocator;
	sheetWithinDocument?: string;
	itemIndexes?: number[];
}

interface SheetTargetResolutionError {
	itemIndex: number;
	error: INodeExecutionData['error'];
}

interface OperationResultGroup {
	itemIndex: number;
	results: INodeExecutionData[];
}

function getSheetTarget(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): SheetTarget {
	const { mode, value } = context.getNodeParameter('documentId', itemIndex) as IDataObject;
	const spreadsheetId = getSpreadsheetId(
		context.getNode(),
		mode as ResourceLocator,
		value as string,
	);

	if (operation === 'create') return { spreadsheetId };

	const sheetWithinDocument = context.getNodeParameter('sheetName', itemIndex, undefined, {
		extractValue: true,
	}) as string;
	const { mode: sheetMode } = context.getNodeParameter('sheetName', itemIndex) as {
		mode: ResourceLocator;
	};

	return { spreadsheetId, sheetMode, sheetWithinDocument };
}

function getSheetTargets(
	context: IExecuteFunctions,
	operation: string,
	itemCount: number,
): { targets: SheetTarget[]; errors: SheetTargetResolutionError[] } {
	if (context.getNode().typeVersion < 4.8) {
		try {
			return { targets: [getSheetTarget(context, 0, operation)], errors: [] };
		} catch (error) {
			if (!context.continueOnFail()) throw error;
			return {
				targets: [],
				errors: [{ itemIndex: 0, error: error as INodeExecutionData['error'] }],
			};
		}
	}

	// Batch adjacent items that resolve to the same sheet without changing output order.
	const targets: SheetTarget[] = [];
	const errors: SheetTargetResolutionError[] = [];
	let previousKey: string | undefined;
	for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
		let target: SheetTarget;
		try {
			target = getSheetTarget(context, itemIndex, operation);
		} catch (error) {
			if (!context.continueOnFail()) throw error;
			errors.push({ itemIndex, error: error as INodeExecutionData['error'] });
			previousKey = undefined;
			continue;
		}
		const key = JSON.stringify([
			target.spreadsheetId,
			target.sheetMode,
			target.sheetWithinDocument,
		]);
		const previousTarget = targets.at(-1);
		if (previousTarget && key === previousKey) {
			previousTarget.itemIndexes?.push(itemIndex);
		} else {
			target.itemIndexes = [itemIndex];
			targets.push(target);
			previousKey = key;
		}
	}

	return { targets, errors };
}

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let operationResult: INodeExecutionData[] = [];
	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);
	const googleSheets = { resource, operation } as GoogleSheets;

	if (googleSheets.resource === 'spreadsheet') {
		try {
			return [await spreadsheet[googleSheets.operation].execute.call(this)];
		} catch (error) {
			if (!this.continueOnFail()) throw error;
			return [[{ json: items[0].json, error }]];
		}
	}

	const { targets, errors } = getSheetTargets(this, operation, items.length);
	if (this.getNode().typeVersion < 4.8) {
		operationResult.push(
			...errors.map(({ itemIndex, error }) => ({ json: items[itemIndex].json, error })),
		);
	}
	const resultGroups: OperationResultGroup[] = errors.map(({ itemIndex, error }) => ({
		itemIndex,
		results: [{ json: items[itemIndex].json, error, pairedItem: { item: itemIndex } }],
	}));
	for (const target of targets) {
		try {
			const googleSheet = new GoogleSheet(target.spreadsheetId, this);
			let sheetId = '';
			let sheetName = '';

			if (operation !== 'create') {
				if (target.sheetMode === undefined || target.sheetWithinDocument === undefined) {
					throw new UnexpectedError('Google Sheets target is missing its sheet locator');
				}
				const result = await googleSheet.spreadsheetGetSheet(
					this.getNode(),
					target.sheetMode,
					target.sheetWithinDocument,
				);
				sheetId = result.sheetId.toString();
				sheetName = result.title;
			}

			switch (operation) {
				case 'create':
					sheetName = target.spreadsheetId;
					break;
				case 'delete':
					sheetName = sheetId;
					break;
				case 'remove':
					sheetName = `${target.spreadsheetId}||${sheetId}`;
					break;
			}

			const results = await sheet[googleSheets.operation].execute.call(
				this,
				googleSheet,
				sheetName,
				sheetId,
				target.itemIndexes,
			);
			if (target.itemIndexes === undefined) {
				operationResult = operationResult.concat(results);
			} else {
				resultGroups.push({ itemIndex: target.itemIndexes[0], results });
			}
		} catch (error) {
			if (!this.continueOnFail()) throw error;

			const itemIndexes = target.itemIndexes ?? [0];
			if (target.itemIndexes === undefined) {
				operationResult.push({ json: items[0].json, error });
				continue;
			}
			const results = itemIndexes.map((itemIndex) => ({
				json: items[itemIndex].json,
				error,
				pairedItem: { item: itemIndex },
			}));
			resultGroups.push({ itemIndex: itemIndexes[0], results });
		}
	}
	if (this.getNode().typeVersion >= 4.8) {
		resultGroups.sort((a, b) => a.itemIndex - b.itemIndex);
		operationResult = resultGroups.flatMap(({ results }) => results);
	}

	return [operationResult];
}
