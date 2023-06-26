import cheerio from 'cheerio';
import type {
	INodeExecutionData,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { placeholder } from './placeholder';
import { getValue } from './utils';
import { getResolvables } from '@utils/utilities';
import type { IValueData } from './types';

type HtmlCommonAtrributes = {
	id?: string;
	style?: string;
	class?: string;
	other?: string;
};

export const capitalizeHeader = (header: string, capitalize?: boolean) => {
	if (!capitalize) return header;
	return header
		.split('_')
		.filter((word) => word)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
};

export class Html implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTML',
		name: 'html',
		icon: 'file:html.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Work with HTML',
		defaults: {
			name: 'HTML',
		},
		inputs: ['main'],
		outputs: ['main'],
		parameterPane: 'wide',
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate HTML Template',
						value: 'generateHtmlTemplate',
						action: 'Generate HTML template',
					},
					{
						name: 'Extract HTML Content',
						value: 'extractHtmlContent',
						action: 'Extract HTML Content',
					},
					{
						name: 'Convert to HTML Table',
						value: 'convertToHtmlTable',
						action: 'Converts the input data to an HTML table',
					},
				],
				default: 'generateHtmlTemplate',
			},
			{
				displayName: 'HTML Template',
				name: 'html',
				typeOptions: {
					editor: 'htmlEditor',
				},
				type: 'string',
				default: placeholder,
				noDataExpression: true,
				description: 'HTML template to render',
				displayOptions: {
					show: {
						operation: ['generateHtmlTemplate'],
					},
				},
			},
			{
				displayName:
					'<b>Tips</b>: Type ctrl+space for completions. Use <code>{{ }}</code> for expressions and <code>&lt;style&gt;</code> tags for CSS. JS in <code>&lt;script&gt;</code> tags is included but not executed in n8n.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['generateHtmlTemplate'],
					},
				},
			},
			{
				displayName: 'Source Data',
				name: 'sourceData',
				type: 'options',
				options: [
					{
						name: 'Binary',
						value: 'binary',
					},
					{
						name: 'JSON',
						value: 'json',
					},
				],
				default: 'json',
				description: 'If HTML should be read from binary or JSON data',
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
					},
				},
			},
			{
				displayName: 'Binary Property',
				name: 'dataPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						sourceData: ['binary'],
					},
				},
				default: 'data',
				required: true,
				description:
					'Name of the binary property in which the HTML to extract the data from can be found',
			},
			{
				displayName: 'JSON Property',
				name: 'dataPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						sourceData: ['json'],
					},
				},
				default: 'data',
				required: true,
				description:
					'Name of the JSON property in which the HTML to extract the data from can be found. The property can either contain a string or an array of strings.',
			},
			{
				displayName: 'Extraction Values',
				name: 'extractionValues',
				placeholder: 'Add Value',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
					},
				},
				default: {},
				options: [
					{
						name: 'values',
						displayName: 'Values',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
								description: 'The key under which the extracted value should be saved',
							},
							{
								displayName: 'CSS Selector',
								name: 'cssSelector',
								type: 'string',
								default: '',
								placeholder: '.price',
								description: 'The CSS selector to use',
							},
							{
								displayName: 'Return Value',
								name: 'returnValue',
								type: 'options',
								options: [
									{
										name: 'Attribute',
										value: 'attribute',
										description: 'Get an attribute value like "class" from an element',
									},
									{
										name: 'HTML',
										value: 'html',
										description: 'Get the HTML the element contains',
									},
									{
										name: 'Text',
										value: 'text',
										description: 'Get only the text content of the element',
									},
									{
										name: 'Value',
										value: 'value',
										description: 'Get value of an input, select or textarea',
									},
								],
								default: 'text',
								description: 'What kind of data should be returned',
							},
							{
								displayName: 'Attribute',
								name: 'attribute',
								type: 'string',
								displayOptions: {
									show: {
										returnValue: ['attribute'],
									},
								},
								default: '',
								placeholder: 'class',
								description: 'The name of the attribute to return the value off',
							},
							{
								displayName: 'Return Array',
								name: 'returnArray',
								type: 'boolean',
								default: false,
								description:
									'Whether to return the values as an array so if multiple ones get found they also get returned separately. If not set all will be returned as a single string.',
							},
						],
					},
				],
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
					},
				},
				options: [
					{
						displayName: 'Trim Values',
						name: 'trimValues',
						type: 'boolean',
						default: true,
						description:
							'Whether to remove automatically all spaces and newlines from the beginning and end of the values',
					},
				],
			},
			// ----------------------------------
			//       convertToHtmlTable
			// ----------------------------------
			{
				displayName: 'Table Attributes',
				name: 'tableAttributes',
				type: 'collection',
				placeholder: 'Add Attribute',
				default: {},
				displayOptions: {
					show: {
						operation: ['convertToHtmlTable'],
					},
				},
				options: [
					{
						displayName: 'Style',
						name: 'style',
						type: 'string',
						default: '',
						placeholder: 'e.g. border: 1px solid black;',
						description: 'Inline style to use for the table',
					},
					{
						displayName: 'Class',
						name: 'class',
						type: 'string',
						default: '',
						placeholder: 'e.g. my-table my-table-striped',
						description: 'Classes to attach to the table',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						placeholder: 'e.g. my-table-1',
						description: 'ID to attach to the table',
					},
					{
						displayName: 'Other Attributes',
						name: 'other',
						type: 'string',
						default: '',
						placeholder: 'e.g. data="my-data"',
						description: 'Attributes to attach to the table',
					},
				],
			},
			{
				displayName: 'Header Attributes',
				name: 'headerAttributes',
				type: 'collection',
				placeholder: 'Add Attribute',
				default: {},
				displayOptions: {
					show: {
						operation: ['convertToHtmlTable'],
					},
				},
				options: [
					{
						displayName: 'Style',
						name: 'style',
						type: 'string',
						default: '',
						placeholder: 'e.g. border: 1px solid black;',
						description: 'Inline style to use for the table header',
					},
					{
						displayName: 'Class',
						name: 'class',
						type: 'string',
						default: '',
						placeholder: 'e.g. my-header',
						description: 'Classes to attach to the table header',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						placeholder: 'e.g. my-header-1',
						description: 'ID to attach to the table header',
					},
					{
						displayName: 'Other Attributes',
						name: 'other',
						type: 'string',
						default: '',
						placeholder: 'e.g. data="my-header-data"',
						description: 'Attributes to attach to the table header',
					},
				],
			},
			{
				displayName: 'Row Attributes',
				name: 'rowsAttributes',
				type: 'collection',
				placeholder: 'Add Attribute',
				default: {},
				displayOptions: {
					show: {
						operation: ['convertToHtmlTable'],
					},
				},
				options: [
					{
						displayName: 'Style',
						name: 'style',
						type: 'string',
						default: '',
						placeholder: 'e.g. border: 1px solid black;',
						description: 'Inline style to use for the table row',
					},
					{
						displayName: 'Class',
						name: 'class',
						type: 'string',
						default: '',
						placeholder: 'e.g. my-row',
						description: 'Classes to attach to the table row',
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						placeholder: 'e.g. my-row-1',
						description: 'ID to attach to the table row',
					},
					{
						displayName: 'Other Attributes',
						name: 'other',
						type: 'string',
						default: '',
						placeholder: 'e.g. data="my-data"',
						description: 'Attributes to attach to the table row',
					},
				],
			},
			{
				displayName: 'Cell Attributes',
				name: 'cellAttributes',
				type: 'fixedCollection',
				placeholder: 'Add Attribute',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['convertToHtmlTable'],
					},
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Column Header',
								name: 'columnHeader',
								type: 'string',
								default: '',
								placeholder: 'e.g. my-header',
								description: 'Column header under which the cell located in',
								requiresDataPath: 'single',
							},
							{
								displayName: 'Attributes',
								name: 'attributes',
								type: 'collection',
								placeholder: 'Add Attribute',
								default: {},
								options: [
									{
										displayName: 'Style',
										name: 'style',
										type: 'string',
										default: '',
										description: 'Inline style to use for the cell',
									},
									{
										displayName: 'Class',
										name: 'class',
										type: 'string',
										default: '',
										description: 'Classes to attach to the cell',
									},
									{
										displayName: 'ID',
										name: 'id',
										type: 'string',
										default: '',
										description: 'ID to attach to the cell',
									},
									{
										displayName: 'Other Attributes',
										name: 'other',
										type: 'string',
										default: '',
										description: 'Attributes to attach to the cell',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['convertToHtmlTable'],
					},
				},
				options: [
					{
						displayName: 'Capitalize Headers',
						name: 'capitalize',
						type: 'boolean',
						default: false,
						description: 'Whether to capitalize the headers',
					},
					{
						displayName: 'Caption',
						name: 'caption',
						type: 'string',
						default: '',
						description: 'Caption to add to the table',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'convertToHtmlTable' && items.length) {
			let table = '';

			const options = this.getNodeParameter('options', 0);

			const tableAttributes = this.getNodeParameter('tableAttributes', 0) as HtmlCommonAtrributes;
			const tableStyle = tableAttributes.style ? ` style="${tableAttributes.style}"` : '';
			const tableClass = tableAttributes.class ? ` class="${tableAttributes.class}"` : '';
			const tableId = tableAttributes.id ? ` id="${tableAttributes.id}"` : '';

			const itemsData: IDataObject[] = [];
			const itemsKeys = new Set<string>();

			for (const entry of items) {
				itemsData.push(entry.json);

				for (const key of Object.keys(entry.json)) {
					itemsKeys.add(key);
				}
			}

			const headers = Array.from(itemsKeys);

			table += `<table ${tableStyle} ${tableClass} ${tableId} ${tableAttributes.other || ''}>`;

			if (options.caption) {
				table += `<caption>${options.caption}</caption>`;
			}

			const headerAttributes = this.getNodeParameter('headerAttributes', 0) as HtmlCommonAtrributes;
			const headerStyle = headerAttributes.style ? ` style="${headerAttributes.style}"` : '';
			const headerClass = headerAttributes.class ? ` class="${headerAttributes.class}"` : '';
			const headerId = headerAttributes.id ? ` id="${headerAttributes.id}"` : '';

			table += `<thead ${headerStyle} ${headerClass} ${headerId} ${headerAttributes.other || ''}>`;
			table += '<tr>';
			table += headers
				.map((header) => '<th>' + capitalizeHeader(header, options.capitalize as boolean) + '</th>')
				.join('');
			table += '</tr>';
			table += '</thead>';

			table += '<tbody>';
			itemsData.forEach((entry, entryIndex) => {
				const rowsAttributes = this.getNodeParameter(
					'rowsAttributes',
					entryIndex,
				) as HtmlCommonAtrributes;

				const rowStyle = rowsAttributes.style ? ` style="${rowsAttributes.style}"` : '';
				const rowClass = rowsAttributes.class ? ` class="${rowsAttributes.class}"` : '';
				const rowId = rowsAttributes.id ? ` id="${rowsAttributes.id}"` : '';

				table += `<tr ${rowStyle} ${rowClass} ${rowId} ${rowsAttributes.other || ''}>`;

				const cellsAttributesUI = this.getNodeParameter(
					'cellAttributes',
					entryIndex,
					{},
				) as IDataObject;

				const cellsAttributes: IDataObject = {};

				for (const cellAttribute of (cellsAttributesUI.values as IDataObject[]) || []) {
					cellsAttributes[cellAttribute.columnHeader as string] =
						cellAttribute.attributes as HtmlCommonAtrributes;
				}

				table += headers
					.map((header) => {
						let td = '<td>';

						if (cellsAttributes[header]) {
							const cellAttributes = cellsAttributes[header] as HtmlCommonAtrributes;
							const cellStyle = cellAttributes.style ? ` style="${cellAttributes.style}"` : '';
							const cellClass = cellAttributes.class ? ` class="${cellAttributes.class}"` : '';
							const cellId = cellAttributes.id ? ` id="${cellAttributes.id}"` : '';
							const cellOther = cellAttributes.other ? ` ${cellAttributes.other}` : '';
							td = `<td ${cellStyle} ${cellClass} ${cellId} ${cellOther}>`;
						}

						if (typeof entry[header] === 'boolean') {
							const isChecked = entry[header] ? 'checked="checked"' : '';
							td += `<input type="checkbox" ${isChecked}/>`;
						} else {
							td += entry[header];
						}
						td += '</td>';
						return td;
					})
					.join('');
				table += '</tr>';
			});

			table += '</tbody>';
			table += '</table>';

			return this.prepareOutputData([{ json: { table } }]);
		}

		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				if (operation === 'generateHtmlTemplate') {
					// ----------------------------------
					//       generateHtmlTemplate
					// ----------------------------------

					let html = this.getNodeParameter('html', itemIndex) as string;

					for (const resolvable of getResolvables(html)) {
						html = html.replace(
							resolvable,
							this.evaluateExpression(resolvable, itemIndex) as string,
						);
					}

					const result = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ html }),
						{
							itemData: { item: itemIndex },
						},
					);

					returnData.push(...result);
				} else if (operation === 'extractHtmlContent') {
					// ----------------------------------
					//         extractHtmlContent
					// ----------------------------------

					const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex);
					const extractionValues = this.getNodeParameter(
						'extractionValues',
						itemIndex,
					) as IDataObject;
					const options = this.getNodeParameter('options', itemIndex, {});
					const sourceData = this.getNodeParameter('sourceData', itemIndex) as string;

					item = items[itemIndex];

					let htmlArray: string[] | string = [];
					if (sourceData === 'json') {
						if (item.json[dataPropertyName] === undefined) {
							throw new NodeOperationError(
								this.getNode(),
								`No property named "${dataPropertyName}" exists!`,
								{ itemIndex },
							);
						}
						htmlArray = item.json[dataPropertyName] as string;
					} else {
						this.helpers.assertBinaryData(itemIndex, dataPropertyName);
						const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(
							itemIndex,
							dataPropertyName,
						);
						htmlArray = binaryDataBuffer.toString('utf-8');
					}

					// Convert it always to array that it works with a string or an array of strings
					if (!Array.isArray(htmlArray)) {
						htmlArray = [htmlArray];
					}

					for (const html of htmlArray as string[]) {
						const $ = cheerio.load(html);

						const newItem: INodeExecutionData = {
							json: {},
							pairedItem: {
								item: itemIndex,
							},
						};

						// Iterate over all the defined values which should be extracted
						let htmlElement;
						for (const valueData of extractionValues.values as IValueData[]) {
							htmlElement = $(valueData.cssSelector);

							if (valueData.returnArray) {
								// An array should be returned so iterate over one
								// value at a time
								newItem.json[valueData.key] = [];
								htmlElement.each((i, el) => {
									(newItem.json[valueData.key] as Array<string | undefined>).push(
										getValue($(el), valueData, options),
									);
								});
							} else {
								// One single value should be returned
								newItem.json[valueData.key] = getValue(htmlElement, valueData, options);
							}
						}
						returnData.push(newItem);
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}

				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
