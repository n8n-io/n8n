import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeParameters,
} from 'n8n-workflow';

import { set } from 'lodash';

export class TextManipulation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TextManipulation',
		name: 'regexReplace',
		group: ['transform'],
		version: 1,
		description: 'To manipulate string values.',
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
				placeholder: 'Add Text Manipulations',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The texts with manipulations.',
				default: {},
				options: [
					{
						name: 'textWithManipulations',
						displayName: 'Text with manipulations',
						values: [
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								default: '',
								description: 'Plain text.',
							},
							{
								displayName: 'Destination Key',
								name: 'destinationKey',
								type: 'string',
								default: 'data',
								required: true,
								placeholder: 'data',
								description: 'The name the JSON key to copy data to. It is also possible<br />to define deep keys by using dot-notation like for example:<br />"level1.level2.newKey"',
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
								description: 'The manipulations for the text.',
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
														name: 'Encode/Decode',
														value: 'encodeDecode',
														description: 'Encode and Decode string',
													},
													{
														name: 'Upper Case',
														value: 'upperCase',
														description: 'Upper case all characters',
													},
													{
														name: 'Lower Case',
														value: 'lowerCase',
														description: 'Lower case all characters',
													},
													{
														name: 'Replace',
														value: 'replace',
														description: 'Replace substring',
													},
													{
														name: 'Trim',
														value: 'trim',
														description: 'removes whitespace from start or/and end',
													},
													{
														name: 'Pad',
														value: 'pad',
														description: 'Pad string from start or end',
													},
													{
														name: 'Substring',
														value: 'substring',
														description: 'Get a substring',
													},
													{
														name: 'Repeat',
														value: 'repeat',
														description: 'Repeat the string',
													},
												],
												default: 'lowerCase',
											},
											{
												displayName: 'Encode with',
												name: 'encodeWith',
												displayOptions: {
													show: {
														action: [
															'encodeDecode',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'Base64',
														value: 'base64',
														description: 'Base64',
													},
													{
														name: 'Base64Url',
														value: 'base64url',
														description: 'Base64Url',
													},
													{
														name: 'Hex',
														value: 'hex',
														description: 'Hex',
													},
													{
														name: 'Utf8',
														value: 'utf8',
														description: 'Utf8',
													},
													{
														name: 'Utf16le',
														value: 'utf16le',
														description: 'Utf16le',
													},
													{
														name: 'Latin1',
														value: 'latin1',
														description: 'Latin1',
													},
													{
														name: 'Url',
														value: 'url',
														description: 'url',
													},
												],
												default: 'utf8',
											},
											{
												displayName: 'Decode with',
												name: 'decodeWith',
												displayOptions: {
													show: {
														action: [
															'encodeDecode',
														],
													},
												},
												type: 'options',
												options: [
													{
														name: 'Base64',
														value: 'base64',
														description: 'Base64',
													},
													{
														name: 'Base64Url',
														value: 'base64url',
														description: 'Base64Url',
													},
													{
														name: 'Hex',
														value: 'hex',
														description: 'Hex',
													},
													{
														name: 'Utf8',
														value: 'utf8',
														description: 'Utf8',
													},
													{
														name: 'Utf16le',
														value: 'utf16le',
														description: 'Utf16le',
													},
													{
														name: 'Latin1',
														value: 'latin1',
														description: 'Latin1',
													},
													{
														name: 'Url',
														value: 'url',
														description: 'url',
													},
												],
												default: 'utf8',
											},
											{
												displayName: 'Use locale',
												name: 'useLocale',
												displayOptions: {
													show: {
														action: [
															'encodeDecode',
														],
													},
												},
												type: 'boolean',
												default: false,
												description: 'If you wan\'t to use the localbase method.',
											},
											{
												displayName: 'Language',
												name: 'language',
												displayOptions: {
													show: {
														action: [
															'encodeDecode',
														],
														useLocale: [
															true,
														],
													},
												},
												type: 'string',
												default: 'en',
												required: true,
												description: 'Operation to decide where the the data should be mapped to.',
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
														name: 'Normal',
														value: 'normal',
														description: 'Replace a substring by a value',
													},
													{
														name: 'Regex',
														value: 'regex',
														description: 'Replace regex with a pattern',
													},
												],
												default: 'normal',
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
															'regex'
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
															'regex'
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
															'normal'
														],
													},
												},
												type: 'string',
												default: '',
												required: true,
												placeholder: '.*',
												description: 'The substring of the text to be replaced.',
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
															'normal'
														],
													},
												},
												type: 'string',
												default: '',
												placeholder: '',
												description: 'The value to replace with.',
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
															'normal'
														],
													},
												},
												type: 'boolean',
												default: true,
												placeholder: '',
												description: 'If you want to replace all substrings.',
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
														description: 'Trim the string from both sides',
													},
													{
														name: 'Trim Start',
														value: 'trimStart',
														description: 'Trim the string from start',
													},
													{
														name: 'TrimEnd',
														value: 'trimEnd',
														description: 'Trim the string from end',
													},
												],
												default: 'trimBoth',
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
														description: 'Pad the string from start',
													},
													{
														name: 'Pad End',
														value: 'padEnd',
														description: 'Trim the string from end',
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
												description: 'The string to pad the text.',
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
												description: 'The start position (begins with 0). Can also be negativ.',
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
														description: 'Select all to end.',
													},
													{
														name: 'Position',
														value: 'position',
														description: 'The end position of selected rows (exclusive end). Can also be negativ.',
													},
													{
														name: 'Length',
														value: 'length',
														description: 'The length of selected rows.',
													},
												],
												default: 'complete',
												description: 'The end of selected rows.',
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
												description: 'The end of selected rows (exclusive end).',
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
												description: 'The length of selected rows.',
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
												description: 'The number of times to repeat the string.',
											},
										]
									}
								]
							},
						]
					}
				]
			},
		]
	};

	static replaceAll(str: string, substr: string, newSubstr: string) {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
		return str.replace(new RegExp(substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newSubstr);
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		
        let keepOnlySet;
		let item;
		
		let text: string;
		
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
			
			item = items[itemIndex];
			
			const newItem: INodeExecutionData = {
				json: {},
			};
			
			if (keepOnlySet !== true) {
				if (item.binary !== undefined) {
					newItem.binary = {};
					Object.assign(newItem.binary, item.binary);
				}

				newItem.json = JSON.parse(JSON.stringify(item.json));
			}
			
			(this.getNodeParameter('textsWithManipulations.textWithManipulations', itemIndex, []) as INodeParameters[]).forEach((textWithManipulations) => {
				text = textWithManipulations.text as string;
				((textWithManipulations.manipulations as INodeParameters).manipulation as INodeParameters[]).forEach((manipulation) => {
					switch(manipulation.action) {
						case 'encodeDecode':
							if(manipulation.encodeWith == 'url') {
								if(manipulation.decodeWith != 'url') {
									if(manipulation.decodeWith != 'utf8') text = Buffer.from(text, manipulation.decodeWith as string).toString('utf8');
									text = encodeURI(text);
								}
							} else if(manipulation.decodeWith == 'url') {
								text = decodeURI(text);
								if(manipulation.encodeWith != 'utf8') text = Buffer.from(text).toString(manipulation.encodeWith as string);
							} else {
								text = Buffer.from(text, manipulation.decodeWith as string).toString(manipulation.encodeWith as string);
							}
							break;
						case 'upperCase':
							if(manipulation.useLocale) text = (text as any).toLocaleUpperCase(manipulation.language as string);
							else text = text.toUpperCase();
							break;
						case 'lowerCase':
							if(manipulation.useLocale) text = (text as any).toLocaleLowerCase(manipulation.language as string);
							else text = text.toLowerCase();
							break;
						case 'replace':
              switch(manipulation.replaceMode) {
                case 'normal':
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
                  throw new Error('normal or regex are valid options');
              }
							break;
						case 'trim':
							switch(manipulation.trim) {
								case 'trimBoth':
									text = text.trim();
									break;
								case 'trimStart':
									text = text.trimStart();
									break;
								case 'trimEnd':
									text = text.trimEnd();
									break;
								default:
									throw new Error('trimBoth, trimStart or trimEnd are valid options');
							}
							break;
						case 'pad':
							if(manipulation.targetLength < 0) throw new Error('The Target Length has to be set to at least 0 or higher!');
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
									if (manipulation.endLength < 0) {
										throw new Error('The Length has to be set to at least 0 or higher!');
									}
									if(manipulation.startPosition < 0) text = text.substring(manipulation.startPosition as number, text.length + (manipulation.startPosition as number) + (manipulation.endLength as number));
									else text = text.substring(manipulation.startPosition as number, (manipulation.startPosition as number) + (manipulation.endLength as number));
									break;
								default:
									throw new Error('complete, position or length are valid options');
							}
							break;
						case 'repeat':
							if(manipulation.times < 0) throw new Error('The Target Length has to be set to at least 0 or higher!');
							text = text.repeat(manipulation.times as number);
							break;
						default:
							throw new Error('encodeDecode, upperCase, lowerCase, replace, trim, pad, substring or repeat are valid options');
					}
				});
				set(newItem.json, textWithManipulations.destinationKey as string, text);
			});
			
			returnData.push(newItem);
        }

		return this.prepareOutputData(returnData);

	}
}
