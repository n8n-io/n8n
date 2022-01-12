import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import Pageres from 'pageres';

export class PageresNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Pageres Node',
		name: 'PageresNode',
		group: ['transform'],
		version: 1,
		description: 'Basic Pageres Node',
		defaults: {
			name: 'Pageres Node',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'https://harshil.dev',
				description: 'URL of the Website',
			},
			{
				displayName: 'Destination',
				name: 'destination',
				type: 'string',
				default: '',
				placeholder: '/user/local/',
				description: 'Download destination',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		let item: INodeExecutionData;
		let a: any;
		let binaryProperty: string = 'data';
		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)
		for (let i = 0; i < items.length; i++) {
			let url = this.getNodeParameter('url', i, '') as string;
			let destination = this.getNodeParameter('destination', i, '') as string;
			// let result;
			a = await new Pageres({ delay: 2 })
				.src(url, ['480x320', '1024x768', 'iphone 5s'], { crop: true })
				// .src('data:text/html,<h1>Awesome!</h1>', ['1024x768'])
				.dest('./ss.png')
				.run();
			items[i].binary = items[i].binary ?? {};
			//
			items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(
				a
			);
			items[i].binary![binaryProperty].fileName = 'fileName';
			items[i].binary![binaryProperty].fileExtension = 'png';
			console.log('Finished generating screenshots!');
			//name, extension,
			//this.helpers.prepareBinaryData(a);
			console.log(a);
			item = items[i];

			item.json['myString'] = a;
		}
		return this.prepareOutputData(items);
	}
}
