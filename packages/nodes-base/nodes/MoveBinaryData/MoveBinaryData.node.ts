import {
	get,
	set,
	unset,
} from 'lodash';

import {
	BINARY_ENCODING,
} from 'n8n-core';

import { IExecuteFunctions } from 'n8n-core';
import {
	IBinaryData,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import * as iconv from 'iconv-lite';
iconv.encodingExists('utf8');

// Create options for bomAware and encoding
const bomAware: string[] = [];
const encodeDecodeOptions: INodePropertyOptions[] = [];
const encodings = (iconv as any).encodings; // tslint:disable-line:no-any
Object.keys(encodings).forEach(encoding => {
	if (!(encoding.startsWith('_') || typeof encodings[encoding] === 'string')) { // only encodings without direct alias or internals
		if (encodings[encoding].bomAware) {
			bomAware.push(encoding);
		}
		encodeDecodeOptions.push({ name: encoding, value: encoding });
	}
});

encodeDecodeOptions.sort((a, b) => {
	if (a.name < b.name) { return -1; }
	if (a.name > b.name) { return 1; }
	return 0;
});

export class MoveBinaryData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Move Binary Data',
		name: 'moveBinaryData',
		icon: 'fa:exchange-alt',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["mode"]==="binaryToJson" ? "Binary to JSON" : "JSON to Binary"}}',
		description: 'Move data between binary and JSON properties',
		defaults: {
			name: 'Move Binary Data',
			color: '#7722CC',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Binary to JSON',
						value: 'binaryToJson',
						description: 'Move data from Binary to JSON',
					},
					{
						name: 'JSON to Binary',
						value: 'jsonToBinary',
						description: 'Move data from JSON to Binary.',
					},
				],
				default: 'binaryToJson',
				description: 'From and to where data should be moved.',
			},


			// ----------------------------------
			//         binaryToJson
			// ----------------------------------
			{
				displayName: 'Set all Data',
				name: 'setAllData',
				type: 'boolean',
				displayOptions: {
					show: {
						mode: [
							'binaryToJson',
						],
					},
				},
				default: true,
				description: 'If all JSON data should be replaced with the data retrieved from binary key. Else the data will be written to a single key.',
			},
			{
				displayName: 'Source Key',
				name: 'sourceKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'binaryToJson',
						],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description: 'The name of the binary key to get data from. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey"',
			},
			{
				displayName: 'Destination Key',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'binaryToJson',
						],
						setAllData: [
							false,
						],
					},
				},
				default: 'data',
				required: true,
				placeholder: '',
				description: 'The name the JSON key to copy data to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey"',
			},

			// ----------------------------------
			//         jsonToBinary
			// ----------------------------------
			{
				displayName: 'Convert all Data',
				name: 'convertAllData',
				type: 'boolean',
				displayOptions: {
					show: {
						mode: [
							'jsonToBinary',
						],
					},
				},
				default: true,
				description: 'If all JSON data should be converted to binary. Else only the data of one key will be converted.',
			},
			{
				displayName: 'Source Key',
				name: 'sourceKey',
				type: 'string',
				displayOptions: {
					show: {
						convertAllData: [
							false,
						],
						mode: [
							'jsonToBinary',
						],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description: 'The name of the JSON key to get data from. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey"',
			},
			{
				displayName: 'Destination Key',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'jsonToBinary',
						],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description: 'The name the binary key to copy data to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey"',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Data Is Base64',
						name: 'dataIsBase64',
						type: 'boolean',
						displayOptions: {
							hide: {
								'useRawData': [
									true,
								],
							},
							show: {
								'/mode': [
									'jsonToBinary',
								],
								'/convertAllData': [
									false,
								],
							},
						},
						default: false,
						description: 'Keeps the binary data as base64 string.',
					},
					{
						displayName: 'Encoding',
						name: 'encoding',
						type: 'options',
						options: encodeDecodeOptions,
						displayOptions: {
							show: {
								'/mode': [
									'binaryToJson',
									'jsonToBinary',
								],
							},
						},
						default: 'utf8',
						description: 'Set the encoding of the data stream',
					},
					{
						displayName: 'Strip BOM',
						name: 'stripBOM',
						displayOptions: {
							show: {
								'/mode': [
									'binaryToJson',
								],
								encoding: bomAware,
							},
						},
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'Add BOM',
						name: 'addBOM',
						displayOptions: {
							show: {
								'/mode': [
									'jsonToBinary',
								],
								encoding: bomAware,
							},
						},
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': [
									'jsonToBinary',
								],
							},
						},
						default: '',
						placeholder: 'example.json',
						description: 'The file name to set.',
					},
					{
						displayName: 'JSON Parse',
						name: 'jsonParse',
						type: 'boolean',
						displayOptions: {
							hide: {
								'keepAsBase64': [
									true,
								],
							},
							show: {
								'/mode': [
									'binaryToJson',
								],
								'/setAllData': [
									false,
								],
							},
						},
						default: false,
						description: 'Run JSON parse on the data to get proper object data.',
					},
					{
						displayName: 'Keep Source',
						name: 'keepSource',
						type: 'boolean',
						default: false,
						description: 'If the source key should be kept. By default it will be deleted.',
					},
					{
						displayName: 'Keep As Base64',
						name: 'keepAsBase64',
						type: 'boolean',
						displayOptions: {
							hide: {
								'jsonParse': [
									true,
								],
							},
							show: {
								'/mode': [
									'binaryToJson',
								],
								'/setAllData': [
									false,
								],
							},
						},
						default: false,
						description: 'Keeps the binary data as base64 string.',
					},
					{
						displayName: 'Mime Type',
						name: 'mimeType',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': [
									'jsonToBinary',
								],
							},
						},
						default: 'application/json',
						placeholder: 'application/json',
						description: 'The mime-type to set. By default will the mime-type for JSON be set.',
					},
					{
						displayName: 'Use Raw Data',
						name: 'useRawData',
						type: 'boolean',
						displayOptions: {
							hide: {
								'dataIsBase64': [
									true,
								],
							},
							show: {
								'/mode': [
									'jsonToBinary',
								],
							},
						},
						default: false,
						description: 'Use data as is and do not JSON.stringify it.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		const mode = this.getNodeParameter('mode', 0) as string;

		const returnData: INodeExecutionData[] = [];

		let item: INodeExecutionData;
		let newItem: INodeExecutionData;
		let options: IDataObject;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			item = items[itemIndex];
			options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			// Copy the whole JSON data as data on any level can be renamed
			newItem = {
				json: {},
			};

			if (mode === 'binaryToJson') {
				const setAllData = this.getNodeParameter('setAllData', itemIndex) as boolean;
				const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;

				const value = get(item.binary, sourceKey);

				if (value === undefined) {
					// No data found so skip
					continue;
				}

				const encoding = (options.encoding as string) || 'utf8';

				const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, sourceKey);

				let convertedValue: string;

				if (setAllData === true) {
					// Set the full data
					convertedValue = iconv.decode(buffer, encoding, { stripBOM: options.stripBOM as boolean });
					newItem.json = JSON.parse(convertedValue);
				} else {
					// Does get added to existing data so copy it first
					newItem.json = JSON.parse(JSON.stringify(item.json));

					if (options.keepAsBase64 !== true) {
						convertedValue = iconv.decode(buffer, encoding, { stripBOM: options.stripBOM as boolean });
					} else {
						convertedValue = Buffer.from(buffer).toString(BINARY_ENCODING);
					}

					if (options.jsonParse) {
						convertedValue = JSON.parse(convertedValue);
					}

					const destinationKey = this.getNodeParameter('destinationKey', itemIndex, '') as string;
					set(newItem.json, destinationKey, convertedValue);
				}

				if (options.keepSource === true) {
					// Binary data does not get touched so simply reference it
					newItem.binary = item.binary;
				} else {
					// Binary data will change so copy it
					newItem.binary = JSON.parse(JSON.stringify(item.binary));
					unset(newItem.binary, sourceKey);
				}

			} else if (mode === 'jsonToBinary') {
				const convertAllData = this.getNodeParameter('convertAllData', itemIndex) as boolean;
				const destinationKey = this.getNodeParameter('destinationKey', itemIndex) as string;

				const encoding = (options.encoding as string) || 'utf8';
				let value: IDataObject | string = item.json;
				if (convertAllData === false) {
					const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;
					value = get(item.json, sourceKey) as IDataObject;
				}

				if (value === undefined) {
					// No data found so skip
					continue;
				}

				if (item.binary !== undefined) {
					// Item already has binary data so copy it
					newItem.binary = JSON.parse(JSON.stringify(item.binary));
				} else {
					// Item does not have binary data yet so initialize empty
					newItem.binary = {};
				}

				if (options.dataIsBase64 !== true) {
					if (options.useRawData !== true) {
						value = JSON.stringify(value);
					}

					value = iconv.encode(value as string, encoding, { addBOM: options.addBOM as boolean }).toString(BINARY_ENCODING);
				}

				const convertedValue: IBinaryData = {
					data: value as string,
					mimeType: (options.mimeType as string) || 'application/json',
				};

				if (options.fileName) {
					convertedValue.fileName = options.fileName as string;
				}

				set(newItem.binary!, destinationKey, convertedValue);

				if (options.keepSource === true) {
					// JSON data does not get touched so simply reference it
					newItem.json = item.json;
				} else {
					// JSON data will change so copy it

					if (convertAllData === true) {
						// Data should not be kept and all data got converted. So simply set new as empty
						newItem.json = {};
					} else {
						// Data should not be kept and only one key has to get removed. So copy all
						// data and then remove the not needed one
						newItem.json = JSON.parse(JSON.stringify(item.json));
						const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;

						unset(newItem.json, sourceKey);
					}
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`);
			}

			returnData.push(newItem);
		}

		return [returnData];
	}
}
