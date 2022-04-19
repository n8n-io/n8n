import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	openThesaurusApiRequest,
} from './GenericFunctions';

export class OpenThesaurus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenThesaurus',
		name: 'openThesaurus',
		icon: 'file:openthesaurus.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Get synonmns for German words using the OpenThesaurus API',
		defaults: {
			name: 'OpenThesaurus',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get Synonyms',
						value: 'getSynonyms',
						description: 'Get synonyms for a German word in German',
					},
				],
				default: 'getSynonyms',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				description: 'The word to get synonyms for',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getSynonyms',
						],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Options',
				displayOptions: {
					show: {
						operation: [
							'getSynonyms',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Baseform',
						name: 'baseform',
						type: 'boolean',
						default: false,
						description: 'Specifies the basic form for the search term if it is not already a basic form.',
					},
					{
						displayName: 'Similar',
						name: 'similar',
						type: 'boolean',
						default: false,
						description: 'This also returns up to five similarly written words for each answer. This is useful to be able to make a suggestion to the user in the event of a possible typing error.',
					},
					{
						displayName: 'Starts With',
						name: 'startswith',
						type: 'boolean',
						default: false,
						description: 'Like substring = true, but only finds words that begin with the specified search term.',
					},
					{
						displayName: 'Substring',
						name: 'substring',
						type: 'boolean',
						default: false,
						description: 'With this, up to ten words are returned for each answer that only contain the search term as a partial word.',
					},
					{
						displayName: 'Substring From Results',
						name: 'substringFromResults',
						type: 'number',
						default: 0,
						description: 'Specifies from which entry the partial word hits are to be returned. Only works together with substring = true.',
					},
					{
						displayName: 'Substring Max Results',
						name: 'substringMaxResults',
						type: 'number',
						typeOptions: {
							maxValue: 250,
						},
						default: 10,
						description: 'Specifies how many partial word hits should be returned in total. Only works together with substring = true.',
					},
					{
						displayName: 'Subsynsets',
						name: 'subsynsets',
						type: 'boolean',
						default: false,
						description: 'Indicates that each synonym group has its (optional) sub-terms supplied.',
					},
					{
						displayName: 'Supersynsets',
						name: 'supersynsets',
						type: 'boolean',
						default: false,
						description: 'Indicates that each synonym group is supplied with its (optional) generic terms.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (operation === 'getSynonyms') {
					const text = this.getNodeParameter('text', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;

					qs.q = text;

					Object.assign(qs, options);

					responseData = await openThesaurusApiRequest.call(this, 'GET', `/synonyme/search`, {}, qs);
					responseData = responseData.synsets;
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
