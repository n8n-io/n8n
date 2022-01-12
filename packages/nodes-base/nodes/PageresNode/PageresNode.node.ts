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
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{
						name: 'Url',
						value: 'urlSource',
					},
					{
						name: 'HTML',
						value: 'htmlSource',
					},
				],
				default: 'urlSource',
				description: 'The source to generate image.',
			},
			{
				displayName: 'URL',
				name: 'imageSource',
				type: 'string',
				default: '',
				placeholder: 'https://harshil.dev',
				description: 'URL of the Website',
				displayOptions: {
					show: {
						inputType: [
							'urlSource',
						],
					},
				},
			},
			{
				displayName: 'HTML Snippet',
				name: 'imageSource',
				type: 'string',
				default: '',
				placeholder: '<div><p>Hello World!</p></div>',
				description: 'HTML code',
				displayOptions: {
					show: {
						inputType: [
							'htmlSource',
						],
					},
				},
			},
			{
				displayName: 'Image Resolution',
				name: 'imageResolution',
				type: 'string',
				default: '',
				placeholder: '480x320',
				description: 'Enter Image Resolution',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const sourceType = this.getNodeParameter('inputType', 0) as string;

		let item: INodeExecutionData;
		let generatedImages: any;
		let binaryProperty: string = 'data';

		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		// (This could be a different value for each item in case it contains an expression)

		for (let i = 0; i < items.length; i++) {
			// .src('data:text/html,<h1>Awesome!</h1>', ['1024x768'])
			let imageSource:string = '';
			let imageResolution = this.getNodeParameter('imageResolution', i, '') as string

			if(sourceType === 'urlSource'){
				imageSource = this.getNodeParameter('imageSource', i, '') as string;
			} else {
				const html = this.getNodeParameter('imageSource', i, '') as string
				imageSource = `data:text/html,${html}`;
			}

			generatedImages = await new Pageres({ delay: 2 })
				.src(imageSource, [imageResolution], { crop: true })
				.run();

			items[i].binary = items[i].binary ?? {};
			items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(
				generatedImages[0]
			);
			items[i].binary![binaryProperty].fileName = 'fileName';
			items[i].binary![binaryProperty].fileExtension = 'png';

			item = items[i];

		}
		return this.prepareOutputData(items);
	}
}
