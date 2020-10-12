import Mustache = require('mustache');
import Handlebars = require("handlebars");
import { IExecuteSingleFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class TextTemplate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Text Template',
		name: 'texttemplate',
		icon: 'file:texttemplate.png',
		group: ['transform'],
		version: 1,
		description: 'Fromat your text using a Text Template',
		defaults: {
			name: 'Text Template',
			color: '#F73F39',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Template Engine',
				name: 'templateengine',
				type: 'options',
				options: [
					{
						name: 'Mustache',
						value: 'mustache',
					},
					{
						name: 'Handlebars',
						value: 'handlebars',
					},
				],
				default: 'handlebars',
				description: 'The Template Engine you want to use to transform the Template in the output.',
			},
			{
				displayName: 'Template',
				name: 'template',
				type: 'string',
				default: '{{Template}}',
				description: 'The Template to transform.',
			}
		],

	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		// Input data
		const item = this.getInputData();

		let body: IDataObject | string = item.json;

		const template = this.getNodeParameter('template', '') as string;
		const templateEngine = this.getNodeParameter('templateengine', '') as string;

		let rend = "";
		if (templateEngine == "mustache") {
			rend = Mustache.render(template, item);
		} else if (templateEngine == "handlebars") {
			
			const tem = Handlebars.compile(template);
			rend = tem(item);
		}
		return { json: { rendered: rend } } as INodeExecutionData;

	}
}
