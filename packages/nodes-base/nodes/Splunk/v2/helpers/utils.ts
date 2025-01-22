import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { parseString } from 'xml2js';

import type { SplunkError, SplunkFeedResponse } from './interfaces';
import { SPLUNK } from '../../v1/types';

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

	if (splunkObject[SPLUNK.DICT]) {
		const obj = splunkObject[SPLUNK.DICT][SPLUNK.KEY];
		return { [splunkObject.$.name]: compactEntryContent(obj) };
	}

	if (splunkObject[SPLUNK.LIST]) {
		const items = splunkObject[SPLUNK.LIST][SPLUNK.ITEM];
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
	return content[SPLUNK.DICT][SPLUNK.KEY].reduce((acc: any, cur: any) => {
		acc = { ...acc, ...compactEntryContent(cur) };
		return acc;
	}, {});
}

export function formatEntry(entry: any, doNotFormatContent = false): any {
	const { content, link, ...rest } = entry;
	const formattedContent = doNotFormatContent ? content : formatEntryContent(content);
	const formattedEntry = { ...rest, ...formattedContent };

	if (formattedEntry.id) {
		formattedEntry.entryUrl = formattedEntry.id;
		formattedEntry.id = formattedEntry.id.split('/').pop();
	}

	return formattedEntry;
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

export function setReturnAllOrLimit(this: IExecuteFunctions, qs: IDataObject) {
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

	return id.includes(endpoint) ? id.split(endpoint).pop() : id;
}
