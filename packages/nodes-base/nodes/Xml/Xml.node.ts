import { Builder, Parser } from 'xml2js';
import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class Xml implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'XML',
		name: 'xml',
		icon: 'fa:file-code',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["mode"]==="jsonToxml" ? "JSON to XML" : "XML to JSON"}}',
		description: 'Convert data from and to XML',
		defaults: {
			name: 'XML',
			color: '#333377',
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
						name: 'JSON to XML',
						value: 'jsonToxml',
						description: 'Converts data from JSON to XML',
					},
					{
						name: 'XML to JSON',
						value: 'xmlToJson',
						description: 'Converts data from XML to JSON',
					},
				],
				default: 'xmlToJson',
				description: 'From and to what format the data should be converted',
			},

			// ----------------------------------
			//         option:jsonToxml
			// ----------------------------------
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['jsonToxml'],
					},
				},
				default: 'data',
				required: true,
				description: 'Name of the property to which to contains the converted XML data',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						mode: ['jsonToxml'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Allow Surrogate Chars',
						name: 'allowSurrogateChars',
						type: 'boolean',
						default: false,
						description: 'Whether to allow using characters from the Unicode surrogate blocks',
					},
					{
						displayName: 'Attribute Key',
						name: 'attrkey',
						type: 'string',
						default: '$',
						description: 'Prefix that is used to access the attributes',
					},
					{
						displayName: 'Cdata',
						name: 'cdata',
						type: 'boolean',
						default: false,
						description:
							'Whether to wrap text nodes in &lt;![CDATA[ ... ]]&gt; instead of escaping when necessary. Does not add &lt;![CDATA[ ... ]]&gt; if it is not required.',
					},
					{
						displayName: 'Character Key',
						name: 'charkey',
						type: 'string',
						default: '_',
						description: 'Prefix that is used to access the character content',
					},
					{
						displayName: 'Headless',
						name: 'headless',
						type: 'boolean',
						default: false,
						description: 'Whether to omit the XML header',
					},
					{
						displayName: 'Root Name',
						name: 'rootName',
						type: 'string',
						default: 'root',
						description: 'Root element name to be used',
					},
				],
			},

			// ----------------------------------
			//         option:xmlToJson
			// ----------------------------------
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						mode: ['xmlToJson'],
					},
				},
				default: 'data',
				required: true,
				description: 'Name of the property which contains the XML data to convert',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						mode: ['xmlToJson'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Attribute Key',
						name: 'attrkey',
						type: 'string',
						default: '$',
						description: 'Prefix that is used to access the attributes',
					},
					{
						displayName: 'Character Key',
						name: 'charkey',
						type: 'string',
						default: '_',
						description: 'Prefix that is used to access the character content',
					},
					{
						displayName: 'Explicit Array',
						name: 'explicitArray',
						type: 'boolean',
						default: false,
						description:
							'Whether to always put child nodes in an array if true; otherwise an array is created only if there is more than one',
					},
					{
						displayName: 'Explicit Root',
						name: 'explicitRoot',
						type: 'boolean',
						default: true,
						description:
							'Whether to set this if you want to get the root node in the resulting object',
					},
					{
						displayName: 'Ignore Attributes',
						name: 'ignoreAttrs',
						type: 'boolean',
						default: false,
						description: 'Whether to ignore all XML attributes and only create text nodes',
					},
					{
						displayName: 'Merge Attributes',
						name: 'mergeAttrs',
						type: 'boolean',
						default: true,
						description:
							'Whether to merge attributes and child elements as properties of the parent, instead of keying attributes off a child attribute object. This option is ignored if ignoreAttrs is true.',
					},
					{
						displayName: 'Normalize',
						name: 'normalize',
						type: 'boolean',
						default: false,
						description: 'Whether to trim whitespaces inside text nodes',
					},
					{
						displayName: 'Normalize Tags',
						name: 'normalizeTags',
						type: 'boolean',
						default: false,
						description: 'Whether to normalize all tag names to lowercase',
					},
					{
						displayName: 'Trim',
						name: 'trim',
						type: 'boolean',
						default: false,
						description: 'Whether to trim the whitespace at the beginning and end of text nodes',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const mode = this.getNodeParameter('mode', 0) as string;
		const dataPropertyName = this.getNodeParameter('dataPropertyName', 0);
		const options = this.getNodeParameter('options', 0, {});

		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				item = items[itemIndex];

				if (mode === 'xmlToJson') {
					const parserOptions = Object.assign(
						{
							mergeAttrs: true,
							explicitArray: false,
						},
						options,
					);

					const parser = new Parser(parserOptions);

					if (item.json[dataPropertyName] === undefined) {
						throw new NodeOperationError(
							this.getNode(),
							`No json property "${dataPropertyName}" does not exists on item!`,
							{ itemIndex },
						);
					}

					// @ts-ignore
					const json = await parser.parseStringPromise(item.json[dataPropertyName]);
					returnData.push({ json });
				} else if (mode === 'jsonToxml') {
					const builder = new Builder(options);

					returnData.push({
						json: {
							[dataPropertyName]: builder.buildObject(items[itemIndex].json),
						},
						pairedItem: {
							item: itemIndex,
						},
					});
				} else {
					throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`, {
						itemIndex,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					items[itemIndex] = {
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					};
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
