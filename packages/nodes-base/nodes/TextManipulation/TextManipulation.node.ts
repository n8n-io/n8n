import { IExecuteFunctions } from 'n8n-core';

import {
	BINARY_ENCODING,
} from 'n8n-core';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { get, set } from 'lodash';
import * as entities from 'entities';

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

export class TextManipulation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TextManipulation',
		name: 'textManipulation',
		icon: 'fa:i-cursor',
		group: ['transform'],
		version: 1,
		description: 'Allows you to manipulate string values.',
		defaults: {
			name: 'TextManipulation',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Keep Only Set',
				name: 'keepOnlySet',
				type: 'boolean',
				default: false,
				description: 'If only the values set on this node should be<br />kept and all others removed.',
			},
			{
				displayName: 'Texts with manipulations',
				name: 'textsWithManipulations',
				placeholder: 'Add Texts Manipulations',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The texts to manipulate.',
				default: {},
				options: [
					{
						name: 'textsWithManipulationsValues',
						displayName: 'Texts with manipulations',
						values: [
							{
								name: 'dataSources',
								displayName: 'Data Sources',
								placeholder: 'Add Data Source',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
									sortable: true,
								},
								description: 'The data sources for the manipulations.',
								default: {},
								options: [
									{
										name: 'dataSource',
										displayName: 'Data Source',
										values: [
											{
												displayName: 'Read Operation',
												name: 'readOperation',
												type: 'options',
												options: [
													{
														name: 'Text',
														value: 'fromText',
														description: 'Declare text directly',
													},
													{
														name: 'Read from file',
														value: 'fromFile',
														description: 'Read text from file',
													},
													{
														name: 'Read from JSON',
														value: 'fromJSON',
														description: 'Read text from json',
													},
												],
												default: 'fromText',
											},
											{
												displayName: 'Decode with',
												name: 'fileDecodeWith',
												displayOptions: {
													show: {
														readOperation: [
															'fromFile',
														],
													},
												},
												type: 'options',
												options: encodeDecodeOptions,
												default: 'utf8',
											},
											{
												displayName: 'Strip BOM',
												name: 'fileStripBOM',
												displayOptions: {
													show: {
														readOperation: [
															'fromFile',
														],
														fileDecodeWith: bomAware,
													},
												},
												type: 'boolean',
												default: true,
											},
											{
												displayName: 'Get Manipulated Data',
												name: 'getManipulatedData',
												required: true,
												displayOptions: {
													show: {
														readOperation: [
															'fromFile',
															'fromJSON',
														],
													},
												},
												type: 'boolean',
												default: false,
												description: 'Fetches the new manipulated data instead of the raw data. If none are available, the raw data are taken.',
											},
											{
												displayName: 'Binary Property',
												name: 'binaryPropertyName',
												required: true,
												displayOptions: {
													show: {
														readOperation: [
															'fromFile',
														],
													},
												},
												type: 'string',
												default: 'data',
												description: 'Name of the binary property from which the binary data is to be read.',
											},
											{
												displayName: 'Source Key',
												name: 'sourceKey',
												required: true,
												displayOptions: {
													show: {
														readOperation: [
															'fromJSON',
														],
													},
												},
												type: 'string',
												default: 'data',
												description: 'The name of the JSON key to get data from.<br />It is also possible to define deep keys by using dot-notation like for example:<br />"level1.level2.currentKey"',
											},
											{
												displayName: 'Skip Non-String',
												name: 'skipNonString',
												required: true,
												displayOptions: {
													show: {
														readOperation: [
															'fromJSON',
														],
													},
												},
												type: 'boolean',
												default: true,
												description: 'Non-string data will be skipped. If not, they will be converted automatically.',
											},
											{
												displayName: 'Text',
												name: 'text',
												required: true,
												displayOptions: {
													show: {
														readOperation: [
															'fromText',
														],
													},
												},
												type: 'string',
												default: '',
												description: 'Plain text.',
											},
											{
												displayName: 'Write Operation',
												name: 'writeOperation',
												type: 'options',
												options: [
													{
														name: 'Write to file',
														value: 'toFile',
														description: 'Write the manipulated text to a file.',
													},
													{
														name: 'Write to JSON',
														value: 'toJSON',
														description: 'Write the manipulated text to a json key.',
													},
												],
												default: 'toJSON',
											},
											{
												displayName: 'Encode with',
												name: 'fileEncodeWith',
												displayOptions: {
													show: {
														writeOperation: [
															'toFile',
														],
													},
												},
												type: 'options',
												options: encodeDecodeOptions,
												default: 'utf8',
											},
											{
												displayName: 'Add BOM',
												name: 'fileAddBOM',
												displayOptions: {
													show: {
														writeOperation: [
															'toFile',
														],
														fileEncodeWith: bomAware,
													},
												},
												type: 'boolean',
												default: false,
											},
											{
												displayName: 'Destination Binary Property',
												name: 'destinationBinaryPropertyName',
												required: true,
												displayOptions: {
													show: {
														writeOperation: [
															'toFile',
														],
													},
												},
												type: 'string',
												default: 'data',
												description: 'Name of the binary property where the binary data should be written.',
											},
											{
												displayName: 'File Name',
												name: 'fileName',
												type: 'string',
												displayOptions: {
													show: {
														writeOperation: [
															'toFile',
														],
													},
												},
												default: '',
												placeholder: 'example.txt',
												description: 'The file name to set.',
											},
											{
												displayName: 'Mime Type',
												name: 'mimeType',
												type: 'string',
												displayOptions: {
													show: {
														writeOperation: [
															'toFile',
														],
													},
												},
												default: 'text/plain',
												placeholder: 'text/plain',
												description: 'The mime-type to set. By default will the mime-type for plan text be set.',
											},
											{
												displayName: 'Destination Key',
												name: 'destinationKey',
												displayOptions: {
													show: {
														writeOperation: [
															'toJSON',
														],
													},
												},
												type: 'string',
												default: 'data',
												required: true,
												placeholder: 'data',
												description: 'The name the JSON key to copy data to. It is also possible<br />to define deep keys by using dot-notation like for example:<br />"level1.level2.newKey"',
											},
										],
									},
								],
							},
							{
								displayName: 'Manipulations',
								name: 'manipulations',
								placeholder: 'Add Manipulation',
								type: 'fixedCollection',
								typeOptions: {
									multipleValues: true,
									sortable: true,
								},
								description: 'The manipulations for the data sources.',
								default: {},
								options: [
									{
										name: 'manipulation',
										displayName: 'Manipulation',
										values: [
											{
												displayName: 'Action',
												name: 'action',
												type: 'options',
												options: [
													{
														name: 'Concat',
														value: 'concat',
														description: 'Add string to the beginning or/and end.',
													},
													{
														name: 'Decode/Encode',
														value: 'decodeEncode',
														description: 'Decode and Encode string.',
													},
													{
														name: 'Decode/Encode Entities',
														value: 'decodeEncodeEntities',
														description: 'Decode and Encode HTML & XML entities.',
													},
													{
														name: 'Upper Case',
														value: 'upperCase',
														description: 'Upper case all characters.',
													},
													{
														name: 'Lower Case',
														value: 'lowerCase',
														description: 'Lower case all characters.',
													},
													{
														name: 'Replace',
														value: 'replace',
														description: 'Replace a substring or regex.',
													},
													{
														name: 'Trim',
														value: 'trim',
														description: 'Removes whitespace from the beginning or/and end.',
													},
													{
														name: 'Pad',
														value: 'pad',
														description: 'Pad the string at the beginning or end.',
													},
													{
														name: 'Substring',
														value: 'substring',
														description: 'Get a substring.',
													},
													{
														name: 'Repeat',
														value: 'repeat',
														description: 'Repeat the string.',
													},
												],
												default: 'lowerCase',
											},
											{
												displayName: 'Before',
												name: 'before',
												displayOptions: {
													show: {
														action: [
															'concat',
														],
													},
												},
												type: 'string',
												default: '',
												description: 'String to be added at the beginning.',
											},
											{
												displayName: 'After',
												name: 'after',
												displayOptions: {
													show: {
														action: [
															'concat',
														],
													},
												},
												type: 'string',
												default: '',
												description: 'String to be added at the end.',
											},
											{
												displayName: 'Decode with',
												name: 'decodeWith',
												displayOptions: {
													show: {
														action: [
															'decodeEncode',
														],
													},
												},
												type: 'options',
												options: encodeDecodeOptions,
												default: 'utf8',
											},
											{
												displayName: 'Decode with',
												name: 'decodeWithEntities',
												displayOptions: {
													show: {
														action: [
															'decodeEncodeEntities',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'nothing',
														value: 'nothing',
													},
													{
														name: 'url',
														value: 'url',
													},
													{
														name: 'xml',
														value: 'xml',
													},
													{
														name: 'html',
														value: 'html',
													},
												],
												default: 'nothing',
											},
											{
												displayName: 'Strip BOM',
												name: 'stripBOM',
												displayOptions: {
													show: {
														action: [
															'decodeEncode',
														],
														decodeWith: bomAware,
													},
												},
												type: 'boolean',
												default: true,
											},
											{
												displayName: 'Encode with',
												name: 'encodeWith',
												displayOptions: {
													show: {
														action: [
															'decodeEncode',
														],
													},
												},
												type: 'options',
												options: encodeDecodeOptions,
												default: 'utf8',
											},
											{
												displayName: 'Encode with',
												name: 'encodeWithEntities',
												displayOptions: {
													show: {
														action: [
															'decodeEncodeEntities',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'nothing',
														value: 'nothing',
													},
													{
														name: 'url',
														value: 'url',
													},
													{
														name: 'xml',
														value: 'xml',
													},
													{
														name: 'html',
														value: 'html',
													},
												],
												default: 'nothing',
											},
											{
												displayName: 'Add BOM',
												name: 'addBOM',
												displayOptions: {
													show: {
														action: [
															'decodeEncode',
														],
														encodeWith: bomAware,
													},
												},
												type: 'boolean',
												default: false,
											},
											{
												displayName: 'Use locale',
												name: 'useLocale',
												displayOptions: {
													show: {
														action: [
															'lowerCase',
															'upperCase',
														],
													},
												},
												type: 'boolean',
												default: false,
												description: 'If you want to use the localbase method.',
											},
											{
												displayName: 'Language',
												name: 'language',
												displayOptions: {
													show: {
														action: [
															'lowerCase',
															'upperCase',
														],
														useLocale: [
															true,
														],
													},
												},
												type: 'string',
												default: 'en',
												required: true,
												description: 'Change the language of the localbase method.',
											},
											{
												displayName: 'Replace Mode',
												name: 'replaceMode',
												displayOptions: {
													show: {
														action: [
															'replace',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'Substring',
														value: 'substring',
														description: 'Replace a substring with a value.',
													},
													{
														name: 'Regex',
														value: 'regex',
														description: 'Replace regex with a pattern.',
													},
												],
												default: 'substring',
											},
											{
												displayName: 'Regex',
												name: 'regex',
												displayOptions: {
													show: {
														action: [
															'replace',
														],
														replaceMode: [
															'regex',
														],
													},
												},
												type: 'string',
												default: '',
												required: true,
												placeholder: '.*',
												description: 'Regular expression.',
											},
											{
												displayName: 'Pattern',
												name: 'pattern',
												displayOptions: {
													show: {
														action: [
															'replace',
														],
														replaceMode: [
															'regex',
														],
													},
												},
												type: 'string',
												default: '',
												placeholder: '$&',
												description: '<table><tr><th>Pattern</th><th>Inserts</th></tr><tr><td>$$</td><td>Inserts a "$".</td></tr><tr><td>$&</td><td>Inserts the matched substring.</td></tr><tr><td>$`</td><td>Inserts the portion of the string that precedes the matched substring.</td></tr><tr><td>$\'</td><td>Inserts the portion of the string that follows the matched substring.</td></tr><tr><td>$n</td><td>Where n is a positive integer less than 100, inserts the nth parenthesized submatch string, provided the first argument was a RegExp object. Note that this is 1-indexed. If a group n is not present (e.g., if group is 3), it will be replaced as a literal (e.g., $3).</td></tr><tr><td>$&lt;Name&gt;</td><td>Where Name is a capturing group name. If the group is not in the match, or not in the regular expression, or if a string was passed as the first argument to replace instead of a regular expression, this resolves to a literal (e.g., $&lt;Name&gt;).</td></tr></table>',
											},
											{
												displayName: 'Substring',
												name: 'substring',
												displayOptions: {
													show: {
														action: [
															'replace',
														],
														replaceMode: [
															'substring',
														],
													},
												},
												type: 'string',
												default: '',
												required: true,
												placeholder: '.*',
												description: 'The substring to be replaced.',
											},
											{
												displayName: 'Value',
												name: 'value',
												displayOptions: {
													show: {
														action: [
															'replace',
														],
														replaceMode: [
															'substring',
														],
													},
												},
												type: 'string',
												default: '',
												placeholder: '',
												description: 'The value that should replace the substring.',
											},
											{
												displayName: 'Replace All',
												name: 'replaceAll',
												displayOptions: {
													show: {
														action: [
															'replace',
														],
														replaceMode: [
															'substring',
														],
													},
												},
												type: 'boolean',
												default: true,
												placeholder: '',
												description: 'Replace all substrings (not only the first).',
											},
											{
												displayName: 'Trim',
												name: 'trim',
												displayOptions: {
													show: {
														action: [
															'trim',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'Trim Both',
														value: 'trimBoth',
														description: 'Removes whitespace from the beginning and end.',
													},
													{
														name: 'Trim Start',
														value: 'trimStart',
														description: 'Removes whitespace from the beginning.',
													},
													{
														name: 'Trim End',
														value: 'trimEnd',
														description: 'Removes whitespace from the end.',
													},
												],
												default: 'trimBoth',
											},
											{
												displayName: 'Trim String',
												name: 'trimString',
												displayOptions: {
													show: {
														action: [
															'trim',
														],
													},
												},
												type: 'string',
												default: ' ',
												required: true,
												description: 'The string to trim.',
											},
											{
												displayName: 'Pad',
												name: 'pad',
												displayOptions: {
													show: {
														action: [
															'pad',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'Pad Start',
														value: 'padStart',
														description: 'Pad the string at the beginning.',
													},
													{
														name: 'Pad End',
														value: 'padEnd',
														description: 'Pad the string at the end.',
													},
												],
												default: 'padStart',
											},
											{
												displayName: 'Target Length',
												name: 'targetLength',
												displayOptions: {
													show: {
														action: [
															'pad',
														],
													},
												},
												type: 'number',
												typeOptions: {
													minValue: 0,
												},
												default: 1,
												required: true,
												placeholder: '1',
												description: 'The length to which the string should be padded.',
											},
											{
												displayName: 'Pad String',
												name: 'padString',
												displayOptions: {
													show: {
														action: [
															'pad',
														],
													},
												},
												type: 'string',
												default: ' ',
												required: true,
												description: 'The filling string.',
											},
											{
												displayName: 'Start Position',
												name: 'startPosition',
												displayOptions: {
													show: {
														action: [
															'substring',
														],
													},
												},
												type: 'number',
												default: 0,
												placeholder: '0',
												description: 'The start position (string begins with 0). Can also be negativ.',
											},
											{
												displayName: 'End',
												name: 'end',
												displayOptions: {
													show: {
														action: [
															'substring',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'Complete',
														value: 'complete',
														description: 'Selects everything to the end.',
													},
													{
														name: 'Position',
														value: 'position',
														description: 'Selects everything up to the position (exclusive position). Can also be negative.',
													},
													{
														name: 'Length',
														value: 'length',
														description: 'The length of the selected rows.',
													},
												],
												default: 'complete',
												description: 'The end of the substring.',
											},
											{
												displayName: 'Position',
												name: 'endPosition',
												displayOptions: {
													show: {
														action: [
															'substring',
														],
														end: [
															'position',
														],
													},
												},
												type: 'number',
												default: 1,
												placeholder: '1',
												description: 'The end position of the substring. Can also be negative.',
											},
											{
												displayName: 'Length',
												name: 'endLength',
												displayOptions: {
													show: {
														action: [
															'substring',
														],
														end: [
															'length',
														],
													},
												},
												typeOptions: {
													minValue: 0,
												},
												type: 'number',
												default: 1,
												placeholder: '1',
												description: 'The length of the substring.',
											},
											{
												displayName: 'Times',
												name: 'times',
												displayOptions: {
													show: {
														action: [
															'repeat',
														],
													},
												},
												type: 'number',
												typeOptions: {
													minValue: 0,
												},
												default: 1,
												required: true,
												placeholder: '1',
												description: 'The number of times the string should be repeated.',
											},
										],
									},
								],
							},
						],
					},
				],
			},
		],
	};

	static escapeRegex(str: string) {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	static replaceAll(str: string, substr: string, newSubstr: string) {
		return str.replace(new RegExp(TextManipulation.escapeRegex(substr), 'g'), newSubstr);
	}
	
	static charsTrimLeft(str: string, chars: string) {
		if(chars === ' ') return str.trimLeft();
		chars = TextManipulation.escapeRegex(chars);
		return str.replace(new RegExp('^(' + chars + ')+', 'g'), '');
	}
	
	static charsTrimRight(str: string, chars: string) {
		if(chars === ' ') return str.trimRight();
		chars = TextManipulation.escapeRegex(chars);
		return str.replace(new RegExp('(' + chars + ')+$', 'g'), '');
	}
	
	static charsTrim(str: string, chars: string) {
		if(chars === ' ') return str.trim();
		chars = TextManipulation.escapeRegex(chars);
		return str.replace(new RegExp('^(' + chars + ')+|(' + chars + ')+$', 'g'), '');
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		
		let keepOnlySet: boolean;
		let item: INodeExecutionData;
		let text: string;
		
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
			
			item = items[itemIndex];
			let newItemJson: IDataObject = {};
			const newItemBinary: IBinaryKeyData = {};
			
			if (keepOnlySet !== true) {
				if (item.binary !== undefined) {
					Object.assign(newItemBinary, item.binary);
				}

				newItemJson = JSON.parse(JSON.stringify(item.json));
			}
			
			for (const textsWithManipulationsValues of (this.getNodeParameter('textsWithManipulations.textsWithManipulationsValues', itemIndex, []) as INodeParameters[]) || []) {
				for(const dataSource of ((textsWithManipulationsValues.dataSources as INodeParameters).dataSource as INodeParameters[]) || []) {
					switch(dataSource.readOperation) {
						case 'fromFile':
							if(dataSource.getManipulatedData) {
								if(newItemBinary[dataSource.binaryPropertyName as string] === undefined) {
									if (item.binary === undefined || item.binary[dataSource.binaryPropertyName as string] === undefined) {
										continue;
									}
									text = iconv.decode(
										Buffer.from(item.binary[dataSource.binaryPropertyName as string].data, BINARY_ENCODING),
										dataSource.fileDecodeWith as string,
										{stripBOM: dataSource.fileStripBOM as boolean},
									);
								} else {
									text = iconv.decode(
										Buffer.from(newItemBinary[dataSource.binaryPropertyName as string].data, BINARY_ENCODING),
										dataSource.fileDecodeWith as string,
										{stripBOM: dataSource.fileStripBOM as boolean},
									);
								}
							} else if (item.binary === undefined || item.binary[dataSource.binaryPropertyName as string] === undefined) {
								continue;
							} else {
								text = iconv.decode(
									Buffer.from(item.binary[dataSource.binaryPropertyName as string].data, BINARY_ENCODING),
									dataSource.fileDecodeWith as string,
									{stripBOM: dataSource.fileStripBOM as boolean},
								);
							}
							break;
						case 'fromJSON':
							const value = (dataSource.getManipulatedData && get(newItemJson, dataSource.sourceKey as string)) || get(item.json, dataSource.sourceKey as string);
							if(typeof value === 'string') {
								text = value as string;
							} else if(dataSource.skipNonString) {
								continue;
							} else {
								text = (value || '').toString();
							}
							break;
						case 'fromText':
							text = dataSource.text as string;
							break;
						default:
							throw new Error('fromFile, fromJSON or fromText are valid options');
					}

					for(const manipulation of ((textsWithManipulationsValues.manipulations as INodeParameters).manipulation as INodeParameters[]) || []) {
						switch(manipulation.action) {
							case 'concat':
								text = (manipulation.before || '') + text + (manipulation.after || '');
								break;
							case 'decodeEncode':
								if(manipulation.encodeWith !== manipulation.decodeWith) {
									text = iconv.encode(
										iconv.decode(
											Buffer.from(text),
											manipulation.decodeWith as string,
											{addBOM: manipulation.addBOM as boolean},
										),
										manipulation.encodeWith as string,
										{stripBOM: manipulation.stripBOM as boolean},
									).toString();
								}
								break;
							case 'decodeEncodeEntities':
								if(manipulation.encodeWithEntities !== manipulation.decodeWithEntities) {
									switch(manipulation.decodeWithEntitie) {
										case 'url':
											text = decodeURI(text);
											break;
										case 'xml':
											text = entities.encodeXML(text);
											break;
										case 'html':
											text = entities.encodeHTML(text);
											break;
										case 'nothing':
											break;
										default:
											throw new Error('url, xml, html or nothing are valid options');
									}

									switch(manipulation.encodeWithEntities) {
										case 'url':
											text = encodeURI(text);
											break;
										case 'xml':
											text = entities.encodeXML(text);
											break;
										case 'html':
											text = entities.encodeHTML(text);
											break;
										case 'nothing':
											break;
										default:
											throw new Error('url, xml, html or nothing are valid options');
									}
								}
								break;
							case 'upperCase':
								if(manipulation.useLocale) text = text.toLocaleUpperCase(manipulation.language as string);
								else text = text.toUpperCase();
								break;
							case 'lowerCase':
								if(manipulation.useLocale) text = text.toLocaleLowerCase(manipulation.language as string);
								else text = text.toLowerCase();
								break;
							case 'replace':
								switch(manipulation.replaceMode) {
									case 'substring':
										if(manipulation.replaceAll) {
											text = TextManipulation.replaceAll(text, manipulation.substring as string, manipulation.value as string);
										} else {
											text = text.replace(manipulation.substring as string, manipulation.value as string);
										}
										break;
									case 'regex':
										const regexMatch = (manipulation.regex as string).match(new RegExp('^/(.*?)/([gimusy]*)$'));
							
										if (!regexMatch) {
											text = text.replace(new RegExp(manipulation.regex as string), manipulation.pattern as string);
										} else if (regexMatch.length === 1) {
											text = text.replace(new RegExp(regexMatch[1]), manipulation.pattern as string);
										} else {
											text = text.replace(new RegExp(regexMatch[1], regexMatch[2]), manipulation.pattern as string);
										}
										break;
									default:
										throw new Error('substring or regex are valid options');
								}
								break;
							case 'trim':
								switch(manipulation.trim) {
									case 'trimBoth':
										text = TextManipulation.charsTrim(text, manipulation.trimString as string);
										break;
									case 'trimStart':
										text = TextManipulation.charsTrimLeft(text, manipulation.trimString as string);
										break;
									case 'trimEnd':
										text = TextManipulation.charsTrimRight(text, manipulation.trimString as string);
										break;
									default:
										throw new Error('trimBoth, trimStart or trimEnd are valid options');
								}
								break;
							case 'pad':
								if(manipulation.targetLength == null || manipulation.targetLength < 0) throw new Error('The Target Length has to be set to at least 0 or higher!');
								switch(manipulation.pad) {
									case 'padStart':
										text = text.padStart(manipulation.targetLength as number, manipulation.padString as string);
										break;
									case 'padEnd':
										text = text.padEnd(manipulation.targetLength as number, manipulation.padString as string);
										break;
									default:
										throw new Error('padStart or padEnd are valid options');
								}
								break;
							case 'substring':
								switch (manipulation.end) {
									case 'complete':
										text = text.substring(manipulation.startPosition as number);
										break;
									case 'position':
										text = text.substring(manipulation.startPosition as number, manipulation.endPosition as number);
										break;
									case 'length':
										if (manipulation.endLength == null || manipulation.endLength < 0) {
											throw new Error('The Length has to be set to at least 0 or higher!');
										}
										if((manipulation.startPosition || 0) < 0) text = text.substring(manipulation.startPosition as number, text.length + (manipulation.startPosition as number) + (manipulation.endLength as number));
										else text = text.substring(manipulation.startPosition as number, (manipulation.startPosition as number) + (manipulation.endLength as number));
										break;
									default:
										throw new Error('complete, position or length are valid options');
								}
								break;
							case 'repeat':
								if(manipulation.times == null || manipulation.times < 0) throw new Error('The Times has to be set to at least 0 or higher!');
								text = text.repeat(manipulation.times as number);
								break;
							default:
								throw new Error('decodeEncode, upperCase, lowerCase, replace, trim, pad, substring or repeat are valid options');
						}
					}
					switch(dataSource.writeOperation) {
						case 'toFile':
							newItemBinary![dataSource.destinationBinaryPropertyName as string] = await this.helpers.prepareBinaryData(
								iconv.encode(text, dataSource.fileEncodeWith as string, {addBOM: dataSource.fileAddBOM as boolean}),
								dataSource.fileName as string,
								dataSource.mimeType as string,
							);
							break;
						case 'toJSON':
							set(newItemJson, dataSource.destinationKey as string, text);
							break;
						default:
							throw new Error('toFile or toJSON are valid options');
					}
				}
			}
			returnData.push({
				json: newItemJson,
				binary: Object.keys(newItemBinary).length === 0 ? undefined : newItemBinary,
			});
		}

		return this.prepareOutputData(returnData);

	}
}