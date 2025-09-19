import iconv from 'iconv-lite';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	deepCopy,
	jsonParse,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

iconv.encodingExists('utf8');

// Create options for bomAware and encoding
const bomAware: string[] = [];
const encodeDecodeOptions: INodePropertyOptions[] = [];
const encodings = (iconv as any).encodings;
Object.keys(encodings as IDataObject).forEach((encoding) => {
	if (!(encoding.startsWith('_') || typeof encodings[encoding] === 'string')) {
		// only encodings without direct alias or internals
		if (encodings[encoding].bomAware) {
			bomAware.push(encoding);
		}
		encodeDecodeOptions.push({ name: encoding, value: encoding });
	}
});

encodeDecodeOptions.sort((a, b) => {
	if (a.name < b.name) {
		return -1;
	}
	if (a.name > b.name) {
		return 1;
	}
	return 0;
});

export class MoveBinaryData implements INodeType {
	description: INodeTypeDescription = {
		hidden: true,
		displayName: 'Convert to/from binary data',
		name: 'moveBinaryData',
		icon: 'fa:exchange-alt',
		group: ['transform'],
		version: [1, 1.1],
		subtitle: '={{$parameter["mode"]==="binaryToJson" ? "Binary to JSON" : "JSON to Binary"}}',
		description: 'Move data between binary and JSON properties',
		defaults: {
			name: 'Convert to/from binary data',
			color: '#7722CC',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
						description: 'Move data from JSON to Binary',
					},
				],
				default: 'binaryToJson',
				description: 'From and to where data should be moved',
			},

			// ----------------------------------
			//         binaryToJson
			// ----------------------------------
			{
				displayName: 'Set All Data',
				name: 'setAllData',
				type: 'boolean',
				displayOptions: {
					show: {
						mode: ['binaryToJson'],
					},
				},
				default: true,
				description:
					'Whether all JSON data should be replaced with the data retrieved from binary key. Else the data will be written to a single key.',
			},
			{
				displayName: 'Source Key',
				name: 'sourceKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['binaryToJson'],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description:
					'The name of the binary key to get data from. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey".',
			},
			{
				displayName: 'Destination Key',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['binaryToJson'],
						setAllData: [false],
					},
				},
				default: 'data',
				required: true,
				placeholder: '',
				description:
					'The name the JSON key to copy data to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey".',
			},

			// ----------------------------------
			//         jsonToBinary
			// ----------------------------------
			{
				displayName: 'Convert All Data',
				name: 'convertAllData',
				type: 'boolean',
				displayOptions: {
					show: {
						mode: ['jsonToBinary'],
					},
				},
				default: true,
				description:
					'Whether all JSON data should be converted to binary. Else only the data of one key will be converted.',
			},
			{
				displayName: 'Source Key',
				name: 'sourceKey',
				type: 'string',
				displayOptions: {
					show: {
						convertAllData: [false],
						mode: ['jsonToBinary'],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description:
					'The name of the JSON key to get data from. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey".',
			},
			{
				displayName: 'Destination Key',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['jsonToBinary'],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description:
					'The name the binary key to copy data to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey".',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Add Byte Order Mark (BOM)',
						name: 'addBOM',
						description:
							'Whether to add special marker at the start of your text file. This marker helps some programs understand how to read the file correctly.',
						displayOptions: {
							show: {
								'/mode': ['jsonToBinary'],
								encoding: bomAware,
							},
						},
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Data Is Base64',
						name: 'dataIsBase64',
						type: 'boolean',
						displayOptions: {
							hide: {
								useRawData: [true],
							},
							show: {
								'/mode': ['jsonToBinary'],
								'/convertAllData': [false],
							},
						},
						default: false,
						description: 'Whether to keep the binary data as base64 string',
					},
					{
						displayName: 'Encoding',
						name: 'encoding',
						type: 'options',
						options: encodeDecodeOptions,
						displayOptions: {
							show: {
								'/mode': ['binaryToJson', 'jsonToBinary'],
							},
						},
						default: 'utf8',
						description: 'Choose the character set to use to encode the data',
					},
					{
						displayName: 'Strip BOM',
						name: 'stripBOM',
						displayOptions: {
							show: {
								'/mode': ['binaryToJson'],
								encoding: bomAware,
							},
						},
						type: 'boolean',
						default: true,
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['jsonToBinary'],
							},
						},
						default: '',
						placeholder: 'example.json',
						description: 'The file name to set',
					},
					{
						displayName: 'JSON Parse',
						name: 'jsonParse',
						type: 'boolean',
						displayOptions: {
							hide: {
								keepAsBase64: [true],
							},
							show: {
								'/mode': ['binaryToJson'],
								'/setAllData': [false],
							},
						},
						default: false,
						description: 'Whether to run JSON parse on the data to get proper object data',
					},
					{
						displayName: 'Keep Source',
						name: 'keepSource',
						type: 'boolean',
						default: false,
						description: 'Whether the source key should be kept. By default it will be deleted.',
					},
					{
						displayName: 'Keep As Base64',
						name: 'keepAsBase64',
						type: 'boolean',
						displayOptions: {
							hide: {
								jsonParse: [true],
							},
							show: {
								'/mode': ['binaryToJson'],
								'/setAllData': [false],
							},
						},
						default: false,
						description: 'Whether to keep the binary data as base64 string',
					},
					{
						displayName: 'MIME Type',
						name: 'mimeType',
						type: 'string',
						displayOptions: {
							show: {
								'/mode': ['jsonToBinary'],
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
								dataIsBase64: [true],
							},
							show: {
								'/mode': ['jsonToBinary'],
							},
						},
						default: false,
						description: 'Whether to use data as is and do not JSON.stringify it',
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
			options = this.getNodeParameter('options', itemIndex, {});

			// Copy the whole JSON data as data on any level can be renamed
			newItem = {
				json: {},
				pairedItem: {
					item: itemIndex,
				},
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

				if (setAllData) {
					// Set the full data
					convertedValue = iconv.decode(buffer, encoding, {
						stripBOM: options.stripBOM as boolean,
					});
					newItem.json = jsonParse(convertedValue);
				} else {
					// Does get added to existing data so copy it first
					newItem.json = deepCopy(item.json);

					if (options.keepAsBase64 !== true) {
						convertedValue = iconv.decode(buffer, encoding, {
							stripBOM: options.stripBOM as boolean,
						});
					} else {
						convertedValue = Buffer.from(buffer).toString(BINARY_ENCODING);
					}

					if (options.jsonParse) {
						convertedValue = jsonParse(convertedValue);
					}

					const destinationKey = this.getNodeParameter('destinationKey', itemIndex, '') as string;
					set(newItem.json, destinationKey, convertedValue);
				}

				if (options.keepSource === true) {
					// Binary data does not get touched so simply reference it
					newItem.binary = item.binary;
				} else {
					// Binary data will change so copy it
					newItem.binary = deepCopy(item.binary);
					unset(newItem.binary, sourceKey);
				}
			} else if (mode === 'jsonToBinary') {
				const convertAllData = this.getNodeParameter('convertAllData', itemIndex) as boolean;
				const destinationKey = this.getNodeParameter('destinationKey', itemIndex) as string;

				const encoding = (options.encoding as string) || 'utf8';
				let value: IDataObject | string = item.json;
				if (!convertAllData) {
					const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;
					value = get(item.json, sourceKey) as IDataObject;
				}

				if (value === undefined) {
					// No data found so skip
					continue;
				}

				if (item.binary !== undefined) {
					// Item already has binary data so copy it
					newItem.binary = deepCopy(item.binary);
				} else {
					// Item does not have binary data yet so initialize empty
					newItem.binary = {};
				}

				const nodeVersion = this.getNode().typeVersion;
				let mimeType = options.mimeType as string;

				let data: Buffer;
				if (options.dataIsBase64 !== true) {
					if (options.useRawData !== true || typeof value === 'object') {
						value = JSON.stringify(value);

						if (!mimeType) {
							mimeType = 'application/json';
						}
					}

					data = iconv.encode(value, encoding, { addBOM: options.addBOM as boolean });
				} else {
					data = Buffer.from(value as unknown as string, BINARY_ENCODING);
				}

				if (!mimeType && nodeVersion === 1) {
					mimeType = 'application/json';
				}

				const convertedValue = await this.helpers.prepareBinaryData(
					data,
					options.fileName as string,
					mimeType,
				);

				if (!convertedValue.fileName && nodeVersion > 1) {
					const fileExtension = convertedValue.fileExtension
						? `.${convertedValue.fileExtension}`
						: '';
					convertedValue.fileName = `file${fileExtension}`;
				}

				set(newItem.binary, destinationKey, convertedValue);

				if (options.keepSource === true) {
					// JSON data does not get touched so simply reference it
					newItem.json = item.json;
				} else {
					// JSON data will change so copy it

					if (convertAllData) {
						// Data should not be kept and all data got converted. So simply set new as empty
						newItem.json = {};
					} else {
						// Data should not be kept and only one key has to get removed. So copy all
						// data and then remove the not needed one
						newItem.json = deepCopy(item.json);
						const sourceKey = this.getNodeParameter('sourceKey', itemIndex) as string;

						unset(newItem.json, sourceKey);
					}
				}
			} else {
				throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`, {
					itemIndex,
				});
			}

			returnData.push(newItem);
		}

		return [returnData];
	}
}
