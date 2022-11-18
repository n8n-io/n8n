import cheerio from 'cheerio';
import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

type Cheerio = ReturnType<typeof cheerio>;

interface IValueData {
	attribute?: string;
	cssSelector: string;
	returnValue: string;
	key: string;
	returnArray: boolean;
}

// The extraction functions
const extractFunctions: {
	[key: string]: ($: Cheerio, valueData: IValueData) => string | undefined;
} = {
	attribute: ($: Cheerio, valueData: IValueData): string | undefined =>
		$.attr(valueData.attribute!),
	html: ($: Cheerio, _valueData: IValueData): string | undefined => $.html() || undefined,
	text: ($: Cheerio, _valueData: IValueData): string | undefined => $.text(),
	value: ($: Cheerio, _valueData: IValueData): string | undefined => $.val(),
};

/**
 * Simple helper function which applies options
 */
function getValue($: Cheerio, valueData: IValueData, options: IDataObject) {
	const value = extractFunctions[valueData.returnValue]($, valueData);
	if (options.trimValues === false || value === undefined) {
		return value;
	}

	return value.trim();
}

export class HtmlExtract implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTML Extract',
		name: 'htmlExtract',
		icon: 'fa:cut',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["sourceData"] + ": " + $parameter["dataPropertyName"]}}',
		description: 'Extracts data from HTML',
		defaults: {
			name: 'HTML Extract',
			color: '#333377',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
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
			},
			{
				displayName: 'Binary Property',
				name: 'dataPropertyName',
				type: 'string',
				displayOptions: {
					show: {
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;
				const extractionValues = this.getNodeParameter(
					'extractionValues',
					itemIndex,
				) as IDataObject;
				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
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
					if (item.binary === undefined) {
						throw new NodeOperationError(this.getNode(), `No item does not contain binary data!`, {
							itemIndex,
						});
					}
					if (item.binary[dataPropertyName] === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`No property named "${dataPropertyName}" exists!`,
							{ itemIndex },
						);
					}

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

					// Itterate over all the defined values which should be extracted
					let htmlElement;
					for (const valueData of extractionValues.values as IValueData[]) {
						htmlElement = $(valueData.cssSelector);

						if (valueData.returnArray === true) {
							// An array should be returned so itterate over one
							// value at a time
							newItem.json[valueData.key as string] = [];
							htmlElement.each((i, el) => {
								(newItem.json[valueData.key as string] as Array<string | undefined>).push(
									getValue($(el), valueData, options),
								);
							});
						} else {
							// One single value should be returned
							newItem.json[valueData.key as string] = getValue(htmlElement, valueData, options);
						}
					}
					returnData.push(newItem);
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
