import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import { Converter, Flavor } from 'showdown';

import { JSDOM } from 'jsdom';

import { set } from 'lodash';

export class Markdown implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Markdown',
		name: 'markdown',
		icon: 'file:markdown.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["mode"]==="markdownToHtml" ? "Markdown to HTML" : "HTML to Markdown"}}',
		description: 'Convert data between Markdown and HTML',
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
						description: 'Convert data from Markdown to HTML',
					},
					{
						name: 'HTML to Markdown',
						value: 'htmlToMarkdown',
						description: 'Convert data from HTML to Markdown',
					},
				],
				default: 'htmlToMarkdown',
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
				description: 'The HTML to be converted to markdown',
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
				description: 'The Markdown to be converted to html',
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
				description: 'The field to put the output in. Specify nested fields<br />using dots, e.g."level1.level2.newKey".',
			},

			//============= HTML to Markdown Options ===============
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						'mode': [
							'htmlToMarkdown',
						],
					},
				},
				options: [
					{
						displayName: 'Markdown Flavor',
						name: 'flavor',
						type: 'options',
						options: [
							{
								name: 'Default',
								value: 'vanilla',
								description: 'Defaults defined by Showdown library (<a href="https://github.com/showdownjs/showdown#valid-options" target="_blank">more info</a>)',
							},
							{
								name: 'GitHub',
								value: 'github',
								description: 'GitHub Flavored Markdown (<a href="https://github.github.com/gfm/" target="_blank">more info</a>)',
							},
							{
								name: 'Original',
								value: 'original',
								description: `As first defined by John Gruber (<a href="https://daringfireball.net/projects/markdown/" target='_blank'>more info</a>)`,
							},
						],
						default: 'vanilla',
					},
					{
						displayName: 'Omit Trailing Newline',
						name: 'omitExtraWLInCodeBlocks',
						type: 'boolean',
						default: false,
						description: 'Whether to omit the trailing newline in a code block',
					},
				],
			},
			//============= Markdown to HTML Options ===============
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						'mode': [
							'markdownToHtml',
						],
					},
				},
				options: [
					{
						displayName: 'Add Blank To Links',
						name: 'openLinksInNewWindow',
						type: 'boolean',
						default: false,
						description: 'Whether to open all links in new windows (by adding the attribute target="_blank" to <a> tags)',
					},
					{
						displayName: 'Automatic Linking To URLs',
						name: 'simplifiedAutoLink',
						type: 'boolean',
						default: false,
						description: 'Whether to enable automatic linking to urls',
					},
					{
						displayName: 'Backslash Escapes HTML Tags',
						name: 'backslashEscapesHTMLTags',
						type: 'boolean',
						default: false,
						description: 'Whether to support for HTML Tag escaping ex: \<div>foo\</div',
					},
					{
						displayName: 'Complete HTML Document',
						name: 'completeHTMLDocument',
						type: 'boolean',
						default: false,
						description: 'Whether to output a complete html document, including <html>, <head> and <body> tags instead of an HTML fragment',
					},
					{
						displayName: 'Customized Header ID',
						name: 'customizedHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to use text in curly braces as header id',
					},
					{
						displayName: 'Emoji Support',
						name: 'emoji',
						type: 'boolean',
						default: false,
						description: 'Whether to enable emoji support. Ex: this is a :smile: emoji For more info on available emojis, see https://github.com/showdownjs/showdown/wiki/Emojis.',
					},
					{
						displayName: 'Encode Emails',
						name: 'encodeEmails',
						type: 'boolean',
						default: true,
						description: 'Whether to enable e-mail addresses encoding through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities',
					},
					{
						displayName: 'Exclude Trailing Punctuation From URLs',
						name: 'excludeTrailingPunctuationFromURLs',
						type: 'boolean',
						default: false,
						description: 'Whether to exclude trailing punctuation from autolinking urls. Punctuation excluded: . ! ? ( ). Only applies if simplifiedAutoLink option is set to true.',
					},
					{
						displayName: 'GitHub Code Blocks',
						name: 'ghCodeBlocks',
						type: 'boolean',
						default: true,
						description: 'Whether to enable support for GFM code block style',
					},
					{
						displayName: 'GitHub Compatible Header IDs',
						name: 'ghCompatibleHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to generate header ids compatible with github style (spaces are replaced with dashes and a bunch of non alphanumeric chars are removed)',
					},
					{
						displayName: 'GitHub Mention Link',
						name: 'ghMentionsLink',
						type: 'string',
						default: 'https://github.com/{u}',
						description: 'Whether to change the link generated by @mentions. Showdown will replace {u} with the username. Only applies if ghMentions option is enabled.',
					},
					{
						displayName: 'GitHub Mentions',
						name: 'ghMentions',
						type: 'boolean',
						default: false,
						description: 'Whether to enable github @mentions, which link to the username mentioned',
					},
					{
						displayName: 'GitHub Task Lists',
						name: 'tasklists',
						type: 'boolean',
						default: false,
						description: 'Whether to enable support for GFM tasklists',
					},
					{
						displayName: 'Header Level Start',
						name: 'headerLevelStart',
						type: 'number',
						default: 1,
						description: 'Whether to set the header starting level',
					},
					{
						displayName: 'Mandatory Space Before Header',
						name: 'requireSpaceBeforeHeadingText',
						type: 'boolean',
						default: false,
						description: 'Whether to make adding a space between # and the header text mandatory',
					},
					{
						displayName: 'Middle Word Asterisks',
						name: 'literalMidWordAsterisks',
						type: 'boolean',
						default: false,
						description: 'Whether to stop showdown from interpreting asterisks in the middle of words as <em> and <strong> and instead treat them as literal asterisks',
					},
					{
						displayName: 'Middle Word Underscores',
						name: 'literalMidWordUnderscores',
						type: 'boolean',
						default: false,
						description: 'Whether to stop showdown from interpreting underscores in the middle of words as <em> and <strong> and instead treat them as literal underscores',
					},
					{
						displayName: 'No Header ID',
						name: 'noHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to disable the automatic generation of header ids',
					},
					{
						displayName: 'Parse Image Dimensions',
						name: 'parseImgDimensions',
						type: 'boolean',
						default: false,
						description: 'Whether to enable support for setting image dimensions from within markdown syntax',
					},
					{
						displayName: 'Prefix Header ID',
						name: 'prefixHeaderId',
						type: 'string',
						default: 'section',
						description: 'Add a prefix to the generated header ids',
					},
					{
						displayName: 'Raw Header ID',
						name: 'rawHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to remove only spaces, \' and " from generated header ids (including prefixes), replacing them with dashes (-)',
					},
					{
						displayName: 'Raw Prefix Header ID',
						name: 'rawPrefixHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to prevent showdown from modifying the prefix',
					},
					{
						displayName: 'Simple Line Breaks',
						name: 'simpleLineBreaks',
						type: 'boolean',
						default: false,
						description: 'Whether to parse line breaks as <br>, like GitHub does, without needing 2 spaces at the end of the line',
					},
					{
						displayName: 'Smart Indentation Fix',
						name: 'smartIndentationFix',
						type: 'boolean',
						default: false,
						description: 'Whether to try to smartly fix indentation problems related to es6 template strings in the midst of indented code',
					},
					{
						displayName: 'Spaces Indented Sublists',
						name: 'disableForced4SpacesIndentedSublists',
						type: 'boolean',
						default: false,
						description: 'Whether to disable the requirement of indenting sublists by 4 spaces for them to be nested, effectively reverting to the old behavior where 2 or 3 spaces were enough',
					},
					{
						displayName: 'Split Adjacent Blockquotes',
						name: 'splitAdjacentBlockquotes',
						type: 'boolean',
						default: false,
						description: 'Whether to split adjacent blockquote blocks',
					},
					{
						displayName: 'Strikethrough',
						name: 'strikethrough',
						type: 'boolean',
						default: false,
						description: 'Whether to enable support for strikethrough syntax',
					},
					{
						displayName: 'Tables Header ID',
						name: 'tablesHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to add an ID property to table headers tags',
					},
					{
						displayName: 'Tables Support',
						name: 'tables',
						type: 'boolean',
						default: false,
						description: 'Whether to enable support for tables syntax',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const converter = new Converter();

		const mode = this.getNodeParameter('mode', 0) as string;

		const { length } = items;
		for (let i = 0; i < length; i++) {
			try {
				if (mode === 'htmlToMarkdown') {
					const options = this.getNodeParameter('options', i) as IDataObject;
					const destinationKey = this.getNodeParameter('destinationKey', i) as string;

					converter.setFlavor(options.flavor as Flavor || 'vanilla');
					Object.keys(options).filter(key => key !== 'flavor').forEach( key => converter.setOption(key, options[key]));

					const html = this.getNodeParameter('html', i) as string;
					const dom = new JSDOM();

					const markdownFromHTML = converter.makeMarkdown(html, dom.window.document	);

					const newItem = JSON.parse(JSON.stringify(items[i].json));
					set(newItem, destinationKey, markdownFromHTML);

					returnData.push(newItem);
				}

				if (mode === 'markdownToHtml') {
					const markdown = this.getNodeParameter('markdown', i) as string;
					const destinationKey = this.getNodeParameter('destinationKey', i) as string;
					const options = this.getNodeParameter('options', i) as IDataObject;

					Object.keys(options).forEach( key => converter.setOption(key, options[key]));
					const htmlFromMarkdown = converter.makeHtml(markdown);

					const newItem = JSON.parse(JSON.stringify(items[i].json));
					set(newItem, destinationKey, htmlFromMarkdown);

					returnData.push(newItem)
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
