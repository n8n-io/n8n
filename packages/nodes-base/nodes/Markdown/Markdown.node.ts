import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { Converter } from 'showdown';

import { NodeHtmlMarkdown } from 'node-html-markdown';

import isEmpty from 'lodash.isempty';
import set from 'lodash.set';

export class Markdown implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Markdown',
		name: 'markdown',
		icon: 'file:markdown.svg',
		group: ['output'],
		version: 1,
		subtitle:
			'={{$parameter["mode"]==="markdownToHtml" ? "Markdown to HTML" : "HTML to Markdown"}}',
		description: 'Convert data between Markdown and HTML',
		defaults: {
			name: 'Markdown',
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
						mode: ['htmlToMarkdown'],
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
						mode: ['markdownToHtml'],
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
						mode: ['markdownToHtml', 'htmlToMarkdown'],
					},
				},
				default: 'data',
				required: true,
				placeholder: '',
				description:
					'The field to put the output in. Specify nested fields using dots, e.g."level1.level2.newKey".',
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
						mode: ['htmlToMarkdown'],
					},
				},
				options: [
					{
						displayName: 'Bullet Marker',
						name: 'bulletMarker',
						type: 'string',
						default: '*',
						description: 'Specify bullet marker, default *',
					},
					{
						displayName: 'Code Block Fence',
						name: 'codeFence',
						type: 'string',
						default: '```',
						description: 'Specify code block fence, default ```',
					},
					{
						displayName: 'Emphasis Delimiter',
						name: 'emDelimiter',
						type: 'string',
						default: '_',
						description: 'Specify emphasis delimiter, default _',
					},
					{
						displayName: 'Global Escape Pattern',
						name: 'globalEscape',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						description:
							'Setting this will override the default escape settings, you might want to use textReplace option instead',
						options: [
							{
								name: 'value',
								displayName: 'Value',
								values: [
									{
										displayName: 'Pattern',
										name: 'pattern',
										type: 'string',
										default: '',
										description: 'RegEx for pattern',
									},
									{
										displayName: 'Replacement',
										name: 'replacement',
										type: 'string',
										default: '',
										description: 'String replacement',
									},
								],
							},
						],
					},
					{
						displayName: 'Ignored Elements',
						name: 'ignore',
						type: 'string',
						default: '',
						description:
							'Supplied elements will be ignored (ignores inner text does not parse children)',
						placeholder: 'e.g. h1, p ...',
						hint: 'Comma separated elements',
					},
					{
						displayName: 'Keep Images With Data',
						name: 'keepDataImages',
						type: 'boolean',
						default: false,
						description:
							'Whether to keep images with data: URI (Note: These can be up to 1MB each), e.g. &lt;img src="data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSK......0o/"&gt;',
					},
					{
						displayName: 'Line Start Escape Pattern',
						name: 'lineStartEscape',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: false,
						},
						default: {},
						description:
							'Setting this will override the default escape settings, you might want to use textReplace option instead',
						options: [
							{
								name: 'value',
								displayName: 'Value',
								values: [
									{
										displayName: 'Pattern',
										name: 'pattern',
										type: 'string',
										default: '',
										description: 'RegEx for pattern',
									},
									{
										displayName: 'Replacement',
										name: 'replacement',
										type: 'string',
										default: '',
										description: 'String replacement',
									},
								],
							},
						],
					},
					{
						displayName: 'Max Consecutive New Lines',
						name: 'maxConsecutiveNewlines',
						type: 'number',
						default: 3,
						description: 'Specify max consecutive new lines allowed',
					},
					{
						displayName: 'Place URLs At The Bottom',
						name: 'useLinkReferenceDefinitions',
						type: 'boolean',
						default: false,
						description:
							'Whether to Place URLS at the bottom and format links using link reference definitions',
					},
					{
						displayName: 'Strong Delimiter',
						name: 'strongDelimiter',
						type: 'string',
						default: '**',
						description: 'Specify strong delimiter, default **',
					},
					{
						displayName: 'Style For Code Block',
						name: 'codeBlockStyle',
						type: 'options',
						default: 'fence',
						description: 'Specify style for code block, default "fence"',
						options: [
							{
								name: 'Fence',
								value: 'fence',
							},
							{
								name: 'Indented',
								value: 'indented',
							},
						],
					},
					{
						displayName: 'Text Replacement Pattern',
						name: 'textReplace',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: [],
						description:
							'User-defined text replacement pattern (Replaces matching text retrieved from nodes)',
						options: [
							{
								name: 'values',
								displayName: 'Values',
								values: [
									{
										displayName: 'Pattern',
										name: 'pattern',
										type: 'string',
										default: '',
										description: 'RegEx for pattern',
									},
									{
										displayName: 'Replacement',
										name: 'replacement',
										type: 'string',
										default: '',
										description: 'String replacement',
									},
								],
							},
						],
					},
					{
						displayName: 'Treat As Blocks',
						name: 'blockElements',
						type: 'string',
						default: '',
						description:
							'Supplied elements will be treated as blocks (surrounded with blank lines)',
						placeholder: 'e.g. p, div, ...',
						hint: 'Comma separated elements',
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
						mode: ['markdownToHtml'],
					},
				},
				options: [
					{
						displayName: 'Add Blank To Links',
						name: 'openLinksInNewWindow',
						type: 'boolean',
						default: false,
						description:
							'Whether to open all links in new windows (by adding the attribute target="_blank" to <a> tags)',
					},
					{
						displayName: 'Automatic Linking to URLs',
						name: 'simplifiedAutoLink',
						type: 'boolean',
						default: false,
						description: 'Whether to enable automatic linking to URLs',
					},
					{
						displayName: 'Backslash Escapes HTML Tags',
						name: 'backslashEscapesHTMLTags',
						type: 'boolean',
						default: false,
						description: 'Whether to support for HTML Tag escaping ex: &lt;div&gt;foo&lt;/div&gt;',
					},
					{
						displayName: 'Complete HTML Document',
						name: 'completeHTMLDocument',
						type: 'boolean',
						default: false,
						description:
							'Whether to output a complete html document, including &lt;html&gt;, &lt;head&gt; and &lt;body&gt; tags instead of an HTML fragment',
					},
					{
						displayName: 'Customized Header ID',
						name: 'customizedHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to use text in curly braces as header ID',
					},
					{
						displayName: 'Emoji Support',
						name: 'emoji',
						type: 'boolean',
						default: false,
						description:
							'Whether to enable emoji support. Ex: this is a :smile: emoji For more info on available emojis, see https://github.com/showdownjs/showdown/wiki/Emojis.',
					},
					{
						displayName: 'Encode Emails',
						name: 'encodeEmails',
						type: 'boolean',
						default: true,
						description:
							'Whether to enable e-mail addresses encoding through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities',
					},
					{
						displayName: 'Exclude Trailing Punctuation From URLs',
						name: 'excludeTrailingPunctuationFromURLs',
						type: 'boolean',
						default: false,
						description:
							'Whether to exclude trailing punctuation from autolinking URLs. Punctuation excluded: . ! ? ( ). Only applies if simplifiedAutoLink option is set to true.',
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
						description:
							'Whether to generate header IDs compatible with github style (spaces are replaced with dashes and a bunch of non alphanumeric chars are removed)',
					},
					{
						displayName: 'GitHub Mention Link',
						name: 'ghMentionsLink',
						type: 'string',
						default: 'https://github.com/{u}',
						description:
							'Whether to change the link generated by @mentions. Showdown will replace {u} with the username. Only applies if ghMentions option is enabled.',
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
						description:
							'Whether to stop showdown from interpreting asterisks in the middle of words as <em> and <strong> and instead treat them as literal asterisks',
					},
					{
						displayName: 'Middle Word Underscores',
						name: 'literalMidWordUnderscores',
						type: 'boolean',
						default: false,
						description:
							'Whether to stop showdown from interpreting underscores in the middle of words as <em> and <strong> and instead treat them as literal underscores',
					},
					{
						displayName: 'No Header ID',
						name: 'noHeaderId',
						type: 'boolean',
						default: false,
						description: 'Whether to disable the automatic generation of header IDs',
					},
					{
						displayName: 'Parse Image Dimensions',
						name: 'parseImgDimensions',
						type: 'boolean',
						default: false,
						description:
							'Whether to enable support for setting image dimensions from within markdown syntax',
					},
					{
						displayName: 'Prefix Header ID',
						name: 'prefixHeaderId',
						type: 'string',
						default: 'section',
						description: 'Add a prefix to the generated header IDs',
					},
					{
						displayName: 'Raw Header ID',
						name: 'rawHeaderId',
						type: 'boolean',
						default: false,
						description:
							'Whether to remove only spaces, \' and " from generated header IDs (including prefixes), replacing them with dashes (-)',
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
						description:
							'Whether to parse line breaks as &lt;br&gt;, like GitHub does, without needing 2 spaces at the end of the line',
					},
					{
						displayName: 'Smart Indentation Fix',
						name: 'smartIndentationFix',
						type: 'boolean',
						default: false,
						description:
							'Whether to try to smartly fix indentation problems related to es6 template strings in the midst of indented code',
					},
					{
						displayName: 'Spaces Indented Sublists',
						name: 'disableForced4SpacesIndentedSublists',
						type: 'boolean',
						default: false,
						description:
							'Whether to disable the requirement of indenting sublists by 4 spaces for them to be nested, effectively reverting to the old behavior where 2 or 3 spaces were enough',
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
		const mode = this.getNodeParameter('mode', 0) as string;

		const { length } = items;
		for (let i = 0; i < length; i++) {
			try {
				if (mode === 'htmlToMarkdown') {
					const options = this.getNodeParameter('options', i);
					const destinationKey = this.getNodeParameter('destinationKey', i) as string;

					const textReplaceOption = this.getNodeParameter(
						'options.textReplace.values',
						i,
						[],
					) as IDataObject[];
					options.textReplace = !isEmpty(textReplaceOption)
						? textReplaceOption.map((entry) => [entry.pattern, entry.replacement])
						: undefined;

					const lineStartEscapeOption = this.getNodeParameter(
						'options.lineStartEscape.value',
						i,
						{},
					) as IDataObject;
					options.lineStartEscape = !isEmpty(lineStartEscapeOption)
						? [lineStartEscapeOption.pattern, lineStartEscapeOption.replacement]
						: undefined;

					const globalEscapeOption = this.getNodeParameter(
						'options.globalEscape.value',
						i,
						{},
					) as IDataObject;
					options.globalEscape = !isEmpty(globalEscapeOption)
						? [globalEscapeOption.pattern, globalEscapeOption.replacement]
						: undefined;

					options.ignore = options.ignore
						? (options.ignore as string).split(',').map((element) => element.trim())
						: undefined;
					options.blockElements = options.blockElements
						? (options.blockElements as string).split(',').map((element) => element.trim())
						: undefined;

					const markdownOptions = {} as IDataObject;

					Object.keys(options).forEach((option) => {
						if (options[option]) {
							markdownOptions[option] = options[option];
						}
					});

					const html = this.getNodeParameter('html', i) as string;

					const markdownFromHTML = NodeHtmlMarkdown.translate(html, markdownOptions);

					const newItem = deepCopy(items[i].json);
					set(newItem, destinationKey, markdownFromHTML);
					returnData.push(newItem);
				}

				if (mode === 'markdownToHtml') {
					const markdown = this.getNodeParameter('markdown', i) as string;
					const destinationKey = this.getNodeParameter('destinationKey', i) as string;
					const options = this.getNodeParameter('options', i);

					const converter = new Converter();

					Object.keys(options).forEach((key) => converter.setOption(key, options[key]));
					const htmlFromMarkdown = converter.makeHtml(markdown);

					const newItem = deepCopy(items[i].json);
					set(newItem, destinationKey, htmlFromMarkdown);

					returnData.push(newItem);
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
