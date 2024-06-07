import cheerio from 'cheerio';
import type {
	INodeExecutionData,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import get from 'lodash/get';
import { placeholder } from './placeholder';
import { getValue } from './utils';
import type { IValueData } from './types';
import { getResolvables, sanitazeDataPathKey } from '@utils/utilities';

export const capitalizeHeader = (header: string, capitalize?: boolean) => {
	if (!capitalize) return header;
	return header
		.split('_')
		.filter((word) => word)
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(' ');
};

const extractionValuesCollection: INodeProperties = {
	displayName: 'Extraction Values',
	name: 'extractionValues',
	placeholder: 'Add Value',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
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
					displayName: 'Skip Selectors',
					name: 'skipSelectors',
					type: 'string',
					displayOptions: {
						show: {
							returnValue: ['text'],
							'@version': [{ _cnd: { gt: 1.1 } }],
						},
					},
					default: '',
					placeholder: 'e.g. img, .className, #ItemId',
					description: 'Comma-separated list of selectors to skip in the text extraction',
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
};

export class Html implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTML',
		name: 'html',
		icon: { light: 'file:html.svg', dark: 'file:html.dark.svg' },
		group: ['transform'],
		version: [1, 1.1, 1.2],
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
						action: 'Convert to HTML Table',
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
				displayName: 'Input Binary Field',
				name: 'dataPropertyName',
				type: 'string',
				requiresDataPath: 'single',
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						sourceData: ['binary'],
					},
				},
				default: 'data',
				required: true,
				hint: 'The name of the input binary field containing the file to be extracted',
			},
			{
				displayName: 'JSON Property',
				name: 'dataPropertyName',
				type: 'string',
				requiresDataPath: 'single',
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
				...extractionValuesCollection,
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						'@version': [1],
					},
				},
			},
			{
				...extractionValuesCollection,
				default: {
					values: [
						{
							key: '',
							cssSelector: '',
							returnValue: 'text',
							returnArray: false,
						},
					],
				},
				displayOptions: {
					show: {
						operation: ['extractHtmlContent'],
						'@version': [{ _cnd: { gt: 1 } }],
					},
				},
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
					{
						displayName: 'Clean Up Text',
						name: 'cleanUpText',
						type: 'boolean',
						default: true,
						description:
							'Whether to remove remove leading and trailing whitespaces, line breaks (newlines) and condense multiple consecutive whitespaces into a single space',
					},
				],
			},
			// ----------------------------------
			//       convertToHtmlTable
			// ----------------------------------
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
						displayName: 'Custom Styling',
						name: 'customStyling',
						type: 'boolean',
						default: false,
						description: 'Whether to use custom styling',
					},
					{
						displayName: 'Caption',
						name: 'caption',
						type: 'string',
						default: '',
						description: 'Caption to add to the table',
					},
					{
						displayName: 'Table Attributes',
						name: 'tableAttributes',
						type: 'string',
						default: '',
						description: 'Attributes to attach to the table',
						placeholder: 'e.g. style="padding:10px"',
					},
					{
						displayName: 'Header Attributes',
						name: 'headerAttributes',
						type: 'string',
						default: '',
						description: 'Attributes to attach to the table header',
						placeholder: 'e.g. style="padding:10px"',
					},
					{
						displayName: 'Row Attributes',
						name: 'rowAttributes',
						type: 'string',
						default: '',
						description: 'Attributes to attach to the table row',
						placeholder: 'e.g. style="padding:10px"',
					},
					{
						displayName: 'Cell Attributes',
						name: 'cellAttributes',
						type: 'string',
						default: '',
						description: 'Attributes to attach to the table cell',
						placeholder: 'e.g. style="padding:10px"',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const nodeVersion = this.getNode().typeVersion;

		if (operation === 'convertToHtmlTable' && items.length) {
			let table = '';

			const options = this.getNodeParameter('options', 0);

			let tableStyle = '';
			let headerStyle = '';
			let cellStyle = '';

			if (!options.customStyling) {
				tableStyle = "style='border-spacing:0; font-family:helvetica,arial,sans-serif'";
				headerStyle =
					"style='margin:0; padding:7px 20px 7px 0px; border-bottom:1px solid #eee; text-align:left; color:#888; font-weight:normal'";
				cellStyle = "style='margin:0; padding:7px 20px 7px 0px; border-bottom:1px solid #eee'";
			}

			const tableAttributes = (options.tableAttributes as string) || '';
			const headerAttributes = (options.headerAttributes as string) || '';

			const itemsData: IDataObject[] = [];
			const itemsKeys = new Set<string>();

			for (const entry of items) {
				itemsData.push(entry.json);

				for (const key of Object.keys(entry.json)) {
					itemsKeys.add(key);
				}
			}

			const headers = Array.from(itemsKeys);

			table += `<table ${tableStyle} ${tableAttributes}>`;

			if (options.caption) {
				table += `<caption>${options.caption}</caption>`;
			}

			table += `<thead ${headerStyle} ${headerAttributes}>`;
			table += '<tr>';
			table += headers
				.map((header) => '<th>' + capitalizeHeader(header, options.capitalize as boolean) + '</th>')
				.join('');
			table += '</tr>';
			table += '</thead>';

			table += '<tbody>';
			itemsData.forEach((entry, entryIndex) => {
				const rowsAttributes = this.getNodeParameter(
					'options.rowAttributes',
					entryIndex,
					'',
				) as string;

				table += `<tr  ${rowsAttributes}>`;

				const cellsAttributes = this.getNodeParameter(
					'options.cellAttributes',
					entryIndex,
					'',
				) as string;

				table += headers
					.map((header) => {
						let td = `<td ${cellStyle} ${cellsAttributes}>`;

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

			return [
				[
					{
						json: { table },
						pairedItem: items.map((_item, index) => ({
							item: index,
						})),
					},
				],
			];
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
						if (nodeVersion === 1) {
							const key = sanitazeDataPathKey(item.json, dataPropertyName);
							if (item.json[key] === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No property named "${dataPropertyName}" exists!`,
									{ itemIndex },
								);
							}
							htmlArray = item.json[key] as string;
						} else {
							const value = get(item.json, dataPropertyName);
							if (value === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									`No property named "${dataPropertyName}" exists!`,
									{ itemIndex },
								);
							}
							htmlArray = value as string;
						}
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

					for (const html of htmlArray) {
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
								htmlElement.each((_, el) => {
									(newItem.json[valueData.key] as Array<string | undefined>).push(
										getValue($(el), valueData, options, nodeVersion),
									);
								});
							} else {
								// One single value should be returned
								newItem.json[valueData.key] = getValue(
									htmlElement,
									valueData,
									options,
									nodeVersion,
								);
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

		return [returnData];
	}
}
