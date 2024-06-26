import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { parseString } from 'xml2js';

import type {
	SplunkError,
	SplunkFeedResponse,
	SplunkResultResponse,
	SplunkSearchResponse,
} from '../types';

function compactEntryContent(splunkObject: any): any {
	if (typeof splunkObject !== 'object') {
		return {};
	}

	if (Array.isArray(splunkObject)) {
		return splunkObject.reduce((acc, cur) => {
			acc = { ...acc, ...compactEntryContent(cur) };
			return acc;
		}, {});
	}

	if (splunkObject['s:dict']) {
		const obj = splunkObject['s:dict']['s:key'];
		return { [splunkObject.$.name]: compactEntryContent(obj) };
	}

	if (splunkObject['s:list']) {
		const items = splunkObject['s:list']['s:item'];
		return { [splunkObject.$.name]: items };
	}

	if (splunkObject._) {
		return {
			[splunkObject.$.name]: splunkObject._,
		};
	}

	return {
		[splunkObject.$.name]: '',
	};
}

function formatEntryContent(content: any): any {
	return content['s:dict']['s:key'].reduce((acc: any, cur: any) => {
		acc = { ...acc, ...compactEntryContent(cur) };
		return acc;
	}, {});
}

export function formatEntry(entry: any, doNotFormatContent = false): any {
	const { content, link, ...rest } = entry;
	const formatedContent = doNotFormatContent ? content : formatEntryContent(content);
	const formattedEntry = { ...rest, ...formatedContent };

	if (formattedEntry.id) {
		formattedEntry.entryUrl = formattedEntry.id;
		formattedEntry.id = formattedEntry.id.split('/').pop();
	}

	return formattedEntry;
}

export function formatSearch(responseData: SplunkSearchResponse) {
	const { entry: entries } = responseData;

	if (!entries) return [];

	return Array.isArray(entries)
		? entries.map((entry) => formatEntry(entry))
		: [formatEntry(entries)];
}

export async function parseXml(xml: string) {
	return await new Promise((resolve, reject) => {
		parseString(xml, { explicitArray: false }, (error, result) => {
			error ? reject(error) : resolve(result);
		});
	});
}

export function extractErrorDescription(rawError: SplunkError) {
	const messages = rawError.response?.messages;
	return messages ? { [messages.msg.$.type.toLowerCase()]: messages.msg._ } : rawError;
}

export function toUnixEpoch(timestamp: string) {
	return Date.parse(timestamp) / 1000;
}

export function formatFeed(responseData: SplunkFeedResponse) {
	const { entry: entries } = responseData.feed;

	if (!entries) return [];

	return Array.isArray(entries)
		? entries.map((entry) => formatEntry(entry))
		: [formatEntry(entries)];
}

function compactResult(splunkObject: any): any {
	if (typeof splunkObject !== 'object') {
		return {};
	}

	if (Array.isArray(splunkObject?.value) && splunkObject?.value[0]?.text) {
		return {
			[splunkObject.$.k]: splunkObject.value.map((v: { text: string }) => v.text).join(','),
		};
	}

	if (!splunkObject?.$?.k || !splunkObject?.value?.text) {
		return {};
	}

	return {
		[splunkObject.$.k]: splunkObject.value.text,
	};
}

function formatResult(field: any): any {
	return field.reduce((acc: any, cur: any) => {
		acc = { ...acc, ...compactResult(cur) };
		return acc;
	}, {});
}

export function formatResults(responseData: SplunkResultResponse) {
	const results = responseData.results.result;
	if (!results) return [];

	return Array.isArray(results)
		? results.map((r) => formatResult(r.field))
		: [formatResult(results.field)];
}

export function setCount(this: IExecuteFunctions, qs: IDataObject) {
	qs.count = this.getNodeParameter('returnAll', 0) ? 0 : this.getNodeParameter('limit', 0);
}

export function populate(source: IDataObject, destination: IDataObject) {
	if (Object.keys(source).length) {
		Object.assign(destination, source);
	}
}

export function getId(
	this: IExecuteFunctions,
	i: number,
	idType: 'userId' | 'searchJobId' | 'searchConfigurationId',
	endpoint: string,
) {
	const id = this.getNodeParameter(idType, i) as string;

	return id.includes(endpoint) ? id.split(endpoint).pop()! : id;
}
