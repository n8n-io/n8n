import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

//@ts-expect-error
import * as showdown from 'showdown';

//@ts-expect-error
import * as jsdom from 'jsdom';

const dom = new jsdom.JSDOM();

const converter = new showdown.Converter();

import {
	set,
} from 'lodash';

export class Markdown implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Markdown',
		name: 'markdown',
		icon: 'file:markdown.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["mode"]==="markdownToHtml" ? "Markdown to HTML" : "HTML to Markdown"}}',
		description: 'Move data between Markdown and HTML.',
		defaults: {
			name: 'Markdown',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Markdown to HTML',
						value: 'markdownToHtml',
						description: 'Move data from MarkdoWN to HTML',
					},
					{
						name: 'HTML to Markdown',
						value: 'htmlToMarkdown',
						description: 'Move data from HTML to Markdown.',
					},
				],
				default: 'htmlToMarkdown',
				description: 'From and to where data should be moved.',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'htmlToMarkdown',
						],
					},
				},
				default: '',
				required: true,
				description: 'The HTML to be converted.',
			},
			{
				displayName: 'Markdown',
				name: 'markdown',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'markdownToHtml',
						],
					},
				},
				default: '',
				required: true,
				description: 'The Markdown to be converted.',
			},
			{
				displayName: 'Destination Key',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						mode: [
							'markdownToHtml',
							'htmlToMarkdown',
						],
					},
				},
				default: 'data',
				required: true,
				placeholder: '',
				description: 'The name the JSON key to copy data to. It is also possible<br />to define deep keys by using dot-notation like for example:<br />"level1.level2.newKey"',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Flavor',
						name: 'flavor',
						type: 'options',
						options: [
							{
								name: 'Github',
								value: 'github',
								description: 'GFM (GitHub Flavored Markdown)',
							},
							{
								name: 'Vanilla',
								value: 'vanilla',
								description: 'Showdown base flavor',
							},
							{
								name: 'Original',
								value: 'original',
								description: `Original markdown flavor as in <a href="https://daringfireball.net/projects/markdown/" rel="nofollow">John Gruber's spec</ a >`,
							},
						],
						displayOptions: {
							show: {
								'/mode': [
									'htmlToMarkdown',
								],
							},
						},
						default: 'vanilla',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length as unknown as number;
		const newItem: INodeExecutionData = { json: {} };
		const mode = this.getNodeParameter('mode', 0) as string;

		for (let i = 0; i < length; i++) {
			if (mode === 'htmlToMarkdown') {
				const options = this.getNodeParameter('options', i) as IDataObject;
				const destinationKey = this.getNodeParameter('destinationKey', i) as string;
				converter.setFlavor(options.flavor as showdown.Flavor || 'vanilla');
				const html = this.getNodeParameter('html', i) as string;
				const md = converter.makeMarkdown(html, dom.window.document);
				newItem.json = JSON.parse(JSON.stringify(items[i].json));
				set(newItem.json, destinationKey, md);
				returnData.push(newItem);
			}

			if (mode === 'markdownToHtml') {
				const markdown = this.getNodeParameter('markdown', i) as string;
				const html = converter.makeHtml(markdown);
				const destinationKey = this.getNodeParameter('destinationKey', i) as string;
				newItem.json = JSON.parse(JSON.stringify(items[i].json));
				set(newItem.json, destinationKey, html);
				returnData.push(newItem);
			}
		}
		return this.prepareOutputData(returnData);
	}
}
