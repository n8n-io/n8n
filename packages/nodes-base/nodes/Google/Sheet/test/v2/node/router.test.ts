import { mock, mockDeep } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	INodeExecutionData,
	NodeParameterValueType,
} from 'n8n-workflow';

import { router } from '../../../v2/actions/router';
import { GoogleSheet } from '../../../v2/helpers/GoogleSheet';

describe('Google Sheets router', () => {
	const items: INodeExecutionData[] = [
		{ json: { document: 'document-1', sheet: 'Customers' } },
		{ json: { document: 'document-2', sheet: 'Orders' } },
	];

	function createExecuteFunctions(
		typeVersion: number,
		inputItems = items,
		config: { throwOnMissingSheet?: boolean } = {},
	) {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue(inputItems);
		executeFunctions.getNode.mockReturnValue(
			mock<INode>({
				id: 'google-sheets',
				name: 'Google Sheets',
				type: 'n8n-nodes-base.googleSheets',
				typeVersion,
				position: [0, 0],
				parameters: {},
			}),
		);
		executeFunctions.continueOnFail.mockReturnValue(false);
		executeFunctions.getNodeParameter.mockImplementation(
			(
				parameterName: string,
				itemIndex: number,
				_fallbackValue?: unknown,
				options?: IGetNodeParameterOptions,
			): object | NodeParameterValueType => {
				const item = inputItems[itemIndex].json;
				if (parameterName === 'sheetName' && options?.extractValue) {
					if (item.sheet === undefined && config.throwOnMissingSheet) {
						throw new Error('Missing sheet');
					}
					return item.sheet;
				}
				const parameters: Record<string, unknown> = {
					resource: 'sheet',
					operation: 'read',
					documentId: { mode: 'id', value: item.document },
					sheetName: { mode: 'name', value: item.sheet },
					options: {},
					'filtersUI.values': [],
					combineFilters: 'AND',
				};

				return parameters[parameterName] as object | NodeParameterValueType;
			},
		);

		return executeFunctions;
	}

	beforeEach(() => {
		vi.spyOn(GoogleSheet.prototype, 'spreadsheetGetSheet').mockImplementation(
			async function (_node, _mode, value) {
				return {
					sheetId: value === 'Customers' ? 1 : 2,
					title: value,
				};
			},
		);
		vi.spyOn(GoogleSheet.prototype, 'getData').mockImplementation(async function (
			this: GoogleSheet,
			range,
		): Promise<string[][]> {
			return [
				['document', 'sheet'],
				[this.id, range],
			];
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('resolves the document and sheet for each input item in version 4.8', async () => {
		const result = await router.call(createExecuteFunctions(4.8));

		expect(result).toEqual([
			[
				{
					json: { document: 'document-1', sheet: 'Customers', row_number: 2 },
					pairedItem: { item: 0 },
				},
				{
					json: { document: 'document-2', sheet: 'Orders', row_number: 2 },
					pairedItem: { item: 1 },
				},
			],
		]);
	});

	it('keeps first-item resource resolution for earlier node versions', async () => {
		const result = await router.call(createExecuteFunctions(4.7));

		expect(result).toEqual([
			[
				{
					json: { document: 'document-1', sheet: 'Customers', row_number: 2 },
					pairedItem: { item: 0 },
				},
				{
					json: { document: 'document-1', sheet: 'Customers', row_number: 2 },
					pairedItem: { item: 1 },
				},
			],
		]);
	});

	it('batches input items that resolve to the same document and sheet', async () => {
		const sameTargetItems = [items[0], { json: { document: 'document-1', sheet: 'Customers' } }];

		await router.call(createExecuteFunctions(4.8, sameTargetItems));

		expect(GoogleSheet.prototype.spreadsheetGetSheet).toHaveBeenCalledTimes(1);
		expect(GoogleSheet.prototype.getData).toHaveBeenCalledTimes(2);
	});

	it('preserves input order when items alternate between sheets', async () => {
		const alternatingItems = [items[0], items[1], items[0]];

		const [result] = await router.call(createExecuteFunctions(4.8, alternatingItems));

		expect(result.map(({ json }) => json.document)).toEqual([
			'document-1',
			'document-2',
			'document-1',
		]);
	});

	it('preserves input order when resource resolution fails with continueOnFail', async () => {
		const inputItems = [items[0], { json: { document: 'document-2' } }, items[1]];
		const executeFunctions = createExecuteFunctions(4.8, inputItems, {
			throwOnMissingSheet: true,
		});
		executeFunctions.continueOnFail.mockReturnValue(true);

		const [result] = await router.call(executeFunctions);

		expect(result.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }, { item: 2 }]);
		expect(result[1].error).toBeInstanceOf(Error);
	});
});
