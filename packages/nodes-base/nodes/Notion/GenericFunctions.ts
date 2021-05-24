import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IDisplayOptions,
	INodeProperties,
	IPollFunctions,
	NodeApiError,
} from 'n8n-workflow';

import {
	camelCase,
	capitalCase,
} from 'change-case';

import * as moment from 'moment-timezone';

export async function notionApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	try {
		let options: OptionsWithUri = {
			headers: {
				'Notion-Version': '2021-05-13',
			},
			method,
			qs,
			body,
			uri: uri || `https://api.notion.com/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);
		const credentials = this.getCredentials('notionApi') as IDataObject;
		options!.headers!['Authorization'] = `Bearer ${credentials.apiKey}`;
		return this.helpers.request!(options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function notionApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await notionApiRequest.call(this, method, endpoint, body, query);
		const { next_cursor } = responseData;
		query['start_cursor'] = next_cursor;
		body['start_cursor'] = next_cursor;
		returnData.push.apply(returnData, responseData[propertyName]);
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		responseData.has_more !== false
	);

	return returnData;
}

export function getBlockTypes() {
	return [
		{
			name: 'Paragraph',
			value: 'paragraph',
		},
		{
			name: 'Heading 1',
			value: 'heading_1',
		},
		{
			name: 'Heading 2',
			value: 'heading_2',
		},
		{
			name: 'Heading 3',
			value: 'heading_3',
		},
		{
			name: 'Toggle',
			value: 'toggle',
		},
		{
			name: 'To-Do',
			value: 'to_do',
		},
		// {
		// 	name: 'Child Page',
		// 	value: 'child_page',
		// },
		{
			name: 'Bulleted List Item',
			value: 'bulleted_list_item',
		},
		{
			name: 'Numbered List Item',
			value: 'numbered_list_item',
		},
	];
}

function textContent(content: string) {
	return {
		text: {
			content,
		},
	};
}

export function formatTitle(content: string) {
	return {
		title: [
			textContent(content),
		],
	};
}

export function formatText(content: string) {
	return {
		text: [
			textContent(content),
		],
	};
}

function getLink(text: { textLink: string, isLink: boolean }) {
	if (text.isLink === true && text.textLink !== '') {
		return {
			link: {
				url: text.textLink,
			},
		};
	}
	return {};
}

function getTexts(texts: [{ textType: string, text: string, isLink: boolean, range: boolean, textLink: string, mentionType: string, dateStart: string, dateEnd: string, date: string, annotationUi: IDataObject, expression: string }]) {
	const results = [];
	for (const text of texts) {
		if (text.textType === 'text') {
			results.push({
				type: 'text',
				text: {
					content: text.text,
					...getLink(text),
				},
				annotations: text.annotationUi,
			});
		} else if (text.textType === 'mention') {
			if (text.mentionType === 'date') {
				results.push({
					type: 'mention',
					mention: {
						type: text.mentionType,
						[text.mentionType]: (text.range === true)
							? { start: text.dateStart, end: text.dateEnd }
							: { start: text.date, end: null },
					},
					annotations: text.annotationUi,
				});
			} else {
				//@ts-ignore
				results.push({
					type: 'mention',
					mention: {
						type: text.mentionType,
						//@ts-ignore
						[text.mentionType]: { id: text[text.mentionType] as string },
					},
					annotations: text.annotationUi,
				});
			}
		} else if (text.textType === 'equation') {
			results.push({
				type: 'equation',
				equation: {
					expression: text.expression,
				},
				annotations: text.annotationUi,
			});
		}
	}
	return results;
}

export function formatBlocks(blocks: IDataObject[]) {
	const results = [];
	for (const block of blocks) {
		results.push({
			object: 'block',
			type: block.type,
			[block.type as string]: {
				...(block.type === 'to_do') ? { checked: block.checked } : { checked: false },
				//@ts-expect-error
				// tslint:disable-next-line: no-any
				text: (block.richText === false) ? formatText(block.textContent).text : getTexts(block.text.text as any || []),
			},
		});
	}
	return results;
}

// tslint:disable-next-line: no-any
function getPropertyKeyValue(value: any, type: string, timezone: string) {
	let result = {};
	switch (type) {
		case 'rich_text':
			if (value.richText === false) {
				result = { rich_text: [{ text: { content: value.textContent } }] };
			} else {
				result = { rich_text: getTexts(value.text.text) };
			}
			break;
		case 'title':
			result = { title: [{ text: { content: value.title } }] };
			break;
		case 'number':
			result = { type: 'number', number: value.numberValue };
			break;
		case 'url':
			result = { type: 'url', url: value.urlValue };
			break;
		case 'checkbox':
			result = { type: 'checkbox', checkbox: value.checkboxValue };
			break;
		case 'relation':
			result = {
				// tslint:disable-next-line: no-any
				type: 'relation', relation: (value.relationValue).reduce((acc: [], cur: any) => {
					return acc.concat(cur.split(',').map((relation: string) => ({ id: relation })));
				}, []),
			};
			break;
		case 'multi_select':
			result = {
				// tslint:disable-next-line: no-any
				type: 'multi_select', multi_select: value.multiSelectValue.filter((id: any) => id !== null).map((option: string) => ({ id: option })),
			};
			break;
		case 'email':
			result = {
				type: 'email', email: value.emailValue,
			};
			break;
		case 'people':
			result = {
				type: 'people', people: value.peopleValue.map((option: string) => ({ id: option })),
			};
			break;
		case 'phone_number':
			result = {
				type: 'phone_number', phone_number: value.phoneValue,
			};
			break;
		case 'select':
			result = {
				type: 'select', select: { id: value.selectValue },
			};
			break;
		case 'date':
			//&& value.dateStart !== 'Invalid date' && value.dateEnd !== 'Invalid date'
			if (value.range === true) {
				result = {
					type: 'date', date: { start: moment.tz(value.dateStart, timezone).utc().format(), end: moment.tz(value.dateEnd, timezone).utc().format() },
				};
				//if (value.date !== 'Invalid date')
			} else {
				result = {
					type: 'date', date: { start: moment.tz(value.date, timezone).utc().format(), end: null },
				};
			}
			break;
		default:
	}
	return result;
}

function getNameAndType(key: string) {
	const [name, type] = key.split('|');
	return {
		name,
		type,
	};
}

export function mapProperties(properties: IDataObject[], timezone: string) {
	return properties.reduce((obj, value) => Object.assign(obj, {
		[`${(value.key as string).split('|')[0]}`]: getPropertyKeyValue(value, (value.key as string).split('|')[1], timezone),
	}), {});
}

export function mapSorting(data: [{ key: string, type: string, direction: string, timestamp: boolean }]) {
	return data.map((sort) => {
		return {
			direction: sort.direction,
			[(sort.timestamp) ? 'timestamp' : 'property']: sort.key.split('|')[0],
		};
	});
}

export function mapFilters(filters: IDataObject[], timezone: string) {
	// tslint:disable-next-line: no-any
	return filters.reduce((obj, value: { [key: string]: any }) => {
		let key = getNameAndType(value.key).type;
		let valuePropertyName = value[`${camelCase(key)}Value`];
		if (['is_empty', 'is_not_empty'].includes(value.condition as string)) {
			valuePropertyName = true;
		} else if (['past_week', 'past_month', 'past_year', 'next_week', 'next_month', 'next_year'].includes(value.condition as string)) {
			valuePropertyName = {};
		}
		if (key === 'rich_text') {
			key = 'text';
		} else if (key === 'phone_number') {
			key = 'phone';
		} else if (key === 'date') {
			valuePropertyName = (valuePropertyName !== undefined && !Object.keys(valuePropertyName).length) ? {} : moment.tz(value.date, timezone).utc().format();
		}
		return Object.assign(obj, {
			['property']: getNameAndType(value.key).name,
			[key]: { [`${value.condition}`]: valuePropertyName },
		});
	}, {});
}

// tslint:disable-next-line: no-any
export function simplifyProperties(properties: any) {
	// tslint:disable-next-line: no-any
	const results: any = {};
	for (const key of Object.keys(properties)) {
		const type = (properties[key] as IDataObject).type as string;
		if (['text'].includes(properties[key].type)) {
			const texts = properties[key].text.map((e: { plain_text: string }) => e.plain_text || {}).join('');
			results[`${key}`] = texts;
		} else if (['url', 'created_time', 'checkbox', 'number', 'last_edited_time', 'email', 'phone_number', 'date'].includes(properties[key].type)) {
			// tslint:disable-next-line: no-any
			results[`${key}`] = properties[key][type] as any;
		} else if (['title'].includes(properties[key].type)) {
			if (Array.isArray(properties[key][type]) && properties[key][type].length !== 0) {
				results[`${key}`] = properties[key][type][0].plain_text;
			} else {
				results[`${key}`] = '';
			}
		} else if (['created_by', 'last_edited_by', 'select'].includes(properties[key].type)) {
			results[`${key}`] = properties[key][type].name;
		} else if (['people'].includes(properties[key].type)) {
			if (Array.isArray(properties[key][type])) {
				// tslint:disable-next-line: no-any
				results[`${key}`] = properties[key][type].map((person: any) => person.person.email || {});
			} else {
				results[`${key}`] = properties[key][type];
			}
		} else if (['multi_select'].includes(properties[key].type)) {
			if (Array.isArray(properties[key][type])) {
				results[`${key}`] = properties[key][type].map((e: IDataObject) => e.name || {});
			} else {
				results[`${key}`] = properties[key][type].options.map((e: IDataObject) => e.name || {});
			}
		} else if (['relation'].includes(properties[key].type)) {
			if (Array.isArray(properties[key][type])) {
				results[`${key}`] = properties[key][type].map((e: IDataObject) => e.id || {});
			} else {
				results[`${key}`] = properties[key][type].database_id;
			}
		} else if (['formula'].includes(properties[key].type)) {
			results[`${key}`] = properties[key][type][properties[key][type].type];

		} else if (['rollup'].includes(properties[key].type)) {
			//TODO figure how to resolve rollup field type
			// results[`${key}`] = properties[key][type][properties[key][type].type];
		}
	}
	return results;
}

// tslint:disable-next-line: no-any
export function simplifyObjects(objects: any) {
	if (!Array.isArray(objects)) {
		objects = [objects];
	}
	const results: IDataObject[] = [];
	for (const { object, id, properties, parent, title } of objects) {
		if (object === 'page' && (parent.type === 'page_id' || parent.type === 'workspace')) {
			results.push({
				id,
				title: properties.title.title[0].plain_text,
			});
		} else if (object === 'page' && parent.type === 'database_id') {
			results.push({
				id,
				...simplifyProperties(properties),
			});
		} else if (object === 'database') {
			results.push({
				id,
				title: title[0].plain_text,
			});
		}
	}
	return results;
}

export function getFormattedChildren(children: IDataObject[]) {
	const results: IDataObject[] = [];
	for (const child of children) {
		const type = child.type;
		results.push({ [`${type}`]: child, object: 'block', type });
	}
	return results;
}

export function getConditions() {

	const elements: INodeProperties[] = [];

	const types: { [key: string]: string } = {
		title: 'rich_text',
		rich_text: 'rich_text',
		number: 'number',
		checkbox: 'checkbox',
		select: 'select',
		multi_select: 'multi_select',
		date: 'date',
		people: 'people',
		files: 'files',
		url: 'rich_text',
		email: 'rich_text',
		phone_number: 'rich_text',
		relation: 'relation',
		//formula: 'formula',
		created_by: 'people',
		created_time: 'date',
		last_edited_by: 'people',
		last_edited_time: 'date',
	};

	const typeConditions: { [key: string]: string[] } = {
		rich_text: [
			'equals',
			'does_not_equal',
			'contains',
			'does_not_contain',
			'starts_with',
			'ends_with',
			'is_empty',
			'is_not_empty',
		],
		number: [
			'equals',
			'does_not_equal',
			'grater_than',
			'less_than',
			'greater_than_or_equal_to',
			'less_than_or_equal_to',
			'is_empty',
			'is_not_empty',
		],
		checkbox: [
			'equals',
			'does_not_equal',
		],
		select: [
			'equals',
			'does_not_equal',
			'is_empty',
			'is_not_empty',
		],
		multi_select: [
			'contains',
			'does_not_equal',
			'is_empty',
			'is_not_empty',
		],
		date: [
			'equals',
			'before',
			'after',
			'on_or_before',
			'is_empty',
			'is_not_empty',
			'on_or_after',
			'past_week',
			'past_month',
			'past_year',
			'next_week',
			'next_month',
			'next_year',
		],
		people: [
			'contains',
			'does_not_contain',
			'is_empty',
			'is_not_empty',
		],
		files: [
			'is_empty',
			'is_not_empty',
		],
		relation: [
			'contains',
			'does_not_contain',
			'is_empty',
			'is_not_empty',
		],
		formula: [
			'contains',
			'does_not_contain',
			'is_empty',
			'is_not_empty',
		],
	};

	for (const type of Object.keys(types)) {
		elements.push(
			{
				displayName: 'Condition',
				name: 'condition',
				type: 'options',
				displayOptions: {
					show: {
						type: [
							type,
						],
					},
				} as IDisplayOptions,
				options: (typeConditions[types[type]] as string[]).map((type: string) => ({ name: capitalCase(type), value: type })),
				default: '',
				description: 'The value of the property to filter by.',
			} as INodeProperties,
		);
	}
	return elements;
}
