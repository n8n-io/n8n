import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { convert } from 'html-to-text';
import { JSDOM } from 'jsdom';
import { get, set, unset } from 'lodash';
import {
	type INodeProperties,
	jsonParse,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
} from 'n8n-workflow';

type ResponseOptimizerFn = (
	x: IDataObject | IDataObject[] | string,
) => IDataObject | IDataObject[] | string;

function htmlOptimizer(
	ctx: IExecuteFunctions,
	itemIndex: number,
	maxLength: number,
): ResponseOptimizerFn {
	const cssSelector = ctx.getNodeParameter('cssSelector', itemIndex, '') as string;
	const onlyContent = ctx.getNodeParameter('onlyContent', itemIndex, false) as boolean;
	let elementsToOmit: string[] = [];

	if (onlyContent) {
		const elementsToOmitUi = ctx.getNodeParameter('elementsToOmit', itemIndex, '') as
			| string
			| string[];

		if (typeof elementsToOmitUi === 'string') {
			elementsToOmit = elementsToOmitUi
				.split(',')
				.filter((s) => s)
				.map((s) => s.trim());
		}
	}

	return (response) => {
		if (typeof response !== 'string') {
			throw new NodeOperationError(
				ctx.getNode(),
				`The response type must be a string. Received: ${typeof response}`,
				{ itemIndex },
			);
		}
		const returnData: string[] = [];

		const html = cheerio.load(response);
		const htmlElements = html(cssSelector);

		htmlElements.each((_, el) => {
			let value = html(el).html() || '';

			if (onlyContent) {
				let htmlToTextOptions;

				if (elementsToOmit?.length) {
					htmlToTextOptions = {
						selectors: elementsToOmit.map((selector) => ({
							selector,
							format: 'skip',
						})),
					};
				}

				value = convert(value, htmlToTextOptions);
			}

			value = value
				.trim()
				.replace(/^\s+|\s+$/g, '')
				.replace(/(\r\n|\n|\r)/gm, '')
				.replace(/\s+/g, ' ');

			returnData.push(value);
		});

		const text = JSON.stringify(returnData, null, 2);

		if (maxLength > 0 && text.length > maxLength) {
			return text.substring(0, maxLength);
		}

		return text;
	};
}

const textOptimizer = (
	ctx: IExecuteFunctions,
	itemIndex: number,
	maxLength: number,
): ResponseOptimizerFn => {
	return (response) => {
		if (typeof response === 'object') {
			try {
				response = JSON.stringify(response, null, 2);
			} catch (error) {}
		}

		if (typeof response !== 'string') {
			throw new NodeOperationError(
				ctx.getNode(),
				`The response type must be a string. Received: ${typeof response}`,
				{ itemIndex },
			);
		}

		const dom = new JSDOM(response);
		const article = new Readability(dom.window.document, {
			keepClasses: true,
		}).parse();

		const text = article?.textContent || '';

		if (maxLength > 0 && text.length > maxLength) {
			return text.substring(0, maxLength);
		}

		return text;
	};
};

const jsonOptimizer = (ctx: IExecuteFunctions, itemIndex: number): ResponseOptimizerFn => {
	return (response) => {
		let responseData: IDataObject | IDataObject[] | string | null = response;

		if (typeof response === 'string') {
			try {
				responseData = jsonParse(response, { errorMessage: 'Invalid JSON response' });
			} catch (error) {
				throw new NodeOperationError(
					ctx.getNode(),
					`Received invalid JSON from response '${response}'`,
					{ itemIndex },
				);
			}
		}

		if (typeof responseData !== 'object' || !responseData) {
			throw new NodeOperationError(
				ctx.getNode(),
				'The response type must be an object or an array of objects',
				{ itemIndex },
			);
		}

		const dataField = ctx.getNodeParameter('dataField', itemIndex, '') as string;
		let returnData: IDataObject[] = [];

		if (!Array.isArray(responseData)) {
			if (dataField) {
				if (!Object.prototype.hasOwnProperty.call(responseData, dataField)) {
					throw new NodeOperationError(
						ctx.getNode(),
						`Target field "${dataField}" not found in response.`,
						{
							itemIndex,
							description: `The response contained these fields: [${Object.keys(responseData).join(', ')}]`,
						},
					);
				}

				const data = responseData[dataField] as IDataObject | IDataObject[];

				if (Array.isArray(data)) {
					responseData = data;
				} else {
					responseData = [data];
				}
			} else {
				responseData = [responseData];
			}
		} else {
			if (dataField) {
				responseData = responseData.map((data) => data[dataField]) as IDataObject[];
			}
		}

		const fieldsToInclude = ctx.getNodeParameter('fieldsToInclude', itemIndex, 'all') as
			| 'all'
			| 'selected'
			| 'except';

		let fields: string | string[] = [];

		if (fieldsToInclude !== 'all') {
			fields = ctx.getNodeParameter('fields', itemIndex, []) as string[] | string;

			if (typeof fields === 'string') {
				fields = fields.split(',').map((field) => field.trim());
			}
		} else {
			returnData = responseData;
		}

		if (fieldsToInclude === 'selected') {
			for (const item of responseData) {
				const newItem: IDataObject = {};

				for (const field of fields) {
					set(newItem, field, get(item, field));
				}

				returnData.push(newItem);
			}
		}

		if (fieldsToInclude === 'except') {
			for (const item of responseData) {
				for (const field of fields) {
					unset(item, field);
				}

				returnData.push(item);
			}
		}

		return returnData;
	};
};

export const configureResponseOptimizer = (
	ctx: IExecuteFunctions,
	itemIndex: number,
): ResponseOptimizerFn => {
	const optimizeResponse = ctx.getNodeParameter('optimizeResponse', itemIndex, false) as boolean;

	if (optimizeResponse) {
		const responseType = ctx.getNodeParameter('responseType', itemIndex) as
			| 'json'
			| 'text'
			| 'html';

		let maxLength = 0;
		const truncateResponse = ctx.getNodeParameter('truncateResponse', itemIndex, false) as boolean;

		if (truncateResponse) {
			maxLength = ctx.getNodeParameter('maxLength', itemIndex, 0) as number;
		}

		switch (responseType) {
			case 'html':
				return htmlOptimizer(ctx, itemIndex, maxLength);
			case 'text':
				return textOptimizer(ctx, itemIndex, maxLength);
			case 'json':
				return jsonOptimizer(ctx, itemIndex);
		}
	}

	return (x) => x;
};

export const optimizeResponseProperties: INodeProperties[] = [
	{
		displayName: 'Optimize Response',
		name: 'optimizeResponse',
		type: 'boolean',
		default: false,
		noDataExpression: true,
		description:
			'Whether the optimize the tool response to reduce amount of data passed to the LLM that could lead to better result and reduce cost',
	},
	{
		displayName: 'Expected Response Type',
		name: 'responseType',
		type: 'options',
		displayOptions: {
			show: {
				optimizeResponse: [true],
			},
		},
		options: [
			{
				name: 'JSON',
				value: 'json',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Text',
				value: 'text',
			},
		],
		default: 'json',
	},
	{
		displayName: 'Field Containing Data',
		name: 'dataField',
		type: 'string',
		default: '',
		placeholder: 'e.g. records',
		description: 'Specify the name of the field in the response containing the data',
		hint: 'leave blank to use whole response',
		requiresDataPath: 'single',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
	},
	{
		displayName: 'Include Fields',
		name: 'fieldsToInclude',
		type: 'options',
		description: 'What fields response object should include',
		default: 'all',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
		},
		options: [
			{
				name: 'All',
				value: 'all',
				description: 'Include all fields',
			},
			{
				name: 'Selected',
				value: 'selected',
				description: 'Include only fields specified below',
			},
			{
				name: 'Except',
				value: 'except',
				description: 'Exclude fields specified below',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'string',
		default: '',
		placeholder: 'e.g. field1,field2',
		description:
			'Comma-separated list of the field names. Supports dot notation. You can drag the selected fields from the input panel.',
		requiresDataPath: 'multiple',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['json'],
			},
			hide: {
				fieldsToInclude: ['all'],
			},
		},
	},
	{
		displayName: 'Selector (CSS)',
		name: 'cssSelector',
		type: 'string',
		description:
			'Select specific element(e.g. body) or multiple elements(e.g. div) of chosen type in the response HTML.',
		placeholder: 'e.g. body',
		default: 'body',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: 'Return Only Content',
		name: 'onlyContent',
		type: 'boolean',
		default: false,
		description:
			'Whether to return only content of html elements, stripping html tags and attributes',
		hint: 'Uses less tokens and may be easier for model to understand',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
			},
		},
	},
	{
		displayName: 'Elements To Omit',
		name: 'elementsToOmit',
		type: 'string',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['html'],
				onlyContent: [true],
			},
		},
		default: '',
		placeholder: 'e.g. img, .className, #ItemId',
		description: 'Comma-separated list of selectors that would be excluded when extracting content',
	},
	{
		displayName: 'Truncate Response',
		name: 'truncateResponse',
		type: 'boolean',
		default: false,
		hint: 'Helps save tokens',
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
			},
		},
	},
	{
		displayName: 'Max Response Characters',
		name: 'maxLength',
		type: 'number',
		default: 1000,
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				optimizeResponse: [true],
				responseType: ['text', 'html'],
				truncateResponse: [true],
			},
		},
	},
];
