import { mock } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { SPLUNK } from '../../v1/types';
import {
	formatEntry,
	extractErrorDescription,
	getId,
	populate,
	formatFeed,
	setReturnAllOrLimit,
	parseXml,
} from '../../v2/helpers/utils';

describe('Splunk, formatEntry', () => {
	test('should format the entry correctly when doNotFormatContent is false', () => {
		const entry = {
			id: 'http://example.com/id/123',
			content: {
				[SPLUNK.DICT]: {
					[SPLUNK.KEY]: [
						{ $: { name: 'key1' }, _: 'value1' },
						{ $: { name: 'key2' }, _: 'value2' },
					],
				},
			},
			link: 'http://example.com/link',
			otherField: 'otherValue',
		};

		const expectedFormattedEntry = {
			otherField: 'otherValue',
			key1: 'value1',
			key2: 'value2',
			entryUrl: 'http://example.com/id/123',
			id: '123',
		};

		const result = formatEntry(entry);
		expect(result).toEqual(expectedFormattedEntry);
	});

	test('should format the entry correctly when doNotFormatContent is true', () => {
		const entry = {
			id: 'http://example.com/id/123',
			key1: 'value1',
			key2: 'value2',
		};

		const expectedFormattedEntry = {
			key1: 'value1',
			key2: 'value2',
			entryUrl: 'http://example.com/id/123',
			id: '123',
		};

		const result = formatEntry(entry, true);
		expect(result).toEqual(expectedFormattedEntry);
	});

	test('should handle entries without id correctly', () => {
		const entry = {
			content: {
				[SPLUNK.DICT]: {
					[SPLUNK.KEY]: [
						{ $: { name: 'key1' }, _: 'value1' },
						{ $: { name: 'key2' }, _: 'value2' },
					],
				},
			},
			otherField: 'otherValue',
		};

		const expectedFormattedEntry = {
			otherField: 'otherValue',
			key1: 'value1',
			key2: 'value2',
		};

		const result = formatEntry(entry);
		expect(result).toEqual(expectedFormattedEntry);
	});
});

describe('Splunk, extractErrorDescription', () => {
	test('should extract the error description correctly when messages are present', () => {
		const rawError = {
			response: {
				messages: {
					msg: {
						$: { type: 'ERROR' },
						_: 'This is an error message',
					},
				},
			},
		};

		const expectedErrorDescription = {
			error: 'This is an error message',
		};

		const result = extractErrorDescription(rawError);
		expect(result).toEqual(expectedErrorDescription);
	});

	test('should return the raw error when messages are not present', () => {
		const rawError = { response: {} };

		const result = extractErrorDescription(rawError);
		expect(result).toEqual(rawError);
	});

	test('should return the raw error when response is not present', () => {
		const rawError = {};

		const result = extractErrorDescription(rawError);
		expect(result).toEqual(rawError);
	});
});

describe('Splunk, getId', () => {
	test('should return id extracted from the id parameter if it is url', () => {
		const executeFunctionsMock = mock<IExecuteFunctions>();
		const endpoint = 'http://example.com/endpoint/admin';

		executeFunctionsMock.getNodeParameter.mockReturnValueOnce(endpoint);
		const id = getId.call(executeFunctionsMock, 0, 'userId', 'http://example.com/endpoint/');

		expect(id).toBe('admin');
	});

	test('should return the unchanged id', () => {
		const executeFunctionsMock = mock<IExecuteFunctions>();

		executeFunctionsMock.getNodeParameter.mockReturnValueOnce('123');
		const id = getId.call(executeFunctionsMock, 0, 'searchConfigurationId', 'endpoint');

		expect(id).toBe('123');
	});
});

describe('Splunk, populate', () => {
	test('should populate destination object with source object properties', () => {
		const source = {
			key1: 'value1',
			key2: 'value2',
		};

		const destination = {
			existingKey: 'existingValue',
		};

		populate(source, destination);

		expect(destination).toEqual({
			existingKey: 'existingValue',
			key1: 'value1',
			key2: 'value2',
		});
	});

	test('should not modify destination object if source object is empty', () => {
		const source = {};

		const destination = {
			existingKey: 'existingValue',
		};

		populate(source, destination);

		expect(destination).toEqual({
			existingKey: 'existingValue',
		});
	});
});

describe('Splunk, formatFeed', () => {
	test('should return an empty array when feed entries are not present', () => {
		const responseData = {
			feed: {
				entry: [],
			},
		};

		const result = formatFeed(responseData);
		expect(result).toEqual([]);
	});

	test('should format feed entries correctly when entries are an array', () => {
		const responseData = {
			feed: {
				entry: [
					{
						id: '1',
						content: { [SPLUNK.DICT]: { [SPLUNK.KEY]: [{ $: { name: 'key1' }, _: 'value1' }] } },
					},
					{
						id: '2',
						content: { [SPLUNK.DICT]: { [SPLUNK.KEY]: [{ $: { name: 'key2' }, _: 'value2' }] } },
					},
				],
			},
		};

		const expectedFormattedEntries = [
			{ id: '1', key1: 'value1', entryUrl: '1' },
			{ id: '2', key2: 'value2', entryUrl: '2' },
		];

		const result = formatFeed(responseData);
		expect(result).toEqual(expectedFormattedEntries);
	});

	test('should format feed entry correctly when entry is a single object', () => {
		const responseData = {
			feed: {
				entry: {
					id: '1',
					content: { [SPLUNK.DICT]: { [SPLUNK.KEY]: [{ $: { name: 'key1' }, _: 'value1' }] } },
				},
			},
		};

		const expectedFormattedEntries = [{ id: '1', key1: 'value1', entryUrl: '1' }];

		const result = formatFeed(responseData);
		expect(result).toEqual(expectedFormattedEntries);
	});
});

describe('Splunk, setCount', () => {
	test('should set count to 0 if returnAll', () => {
		const executeFunctionsMock = mock<IExecuteFunctions>();
		const qs: IDataObject = {};
		executeFunctionsMock.getNodeParameter.calledWith('returnAll', 0).mockReturnValue(true);

		setReturnAllOrLimit.call(executeFunctionsMock, qs);

		expect(qs.count).toBe(0);
	});

	test('should set count to limit if returnAll is false', () => {
		const executeFunctionsMock = mock<IExecuteFunctions>();
		const qs: IDataObject = {};
		executeFunctionsMock.getNodeParameter.calledWith('returnAll', 0).mockReturnValue(false);
		executeFunctionsMock.getNodeParameter.calledWith('limit', 0).mockReturnValue(10);

		setReturnAllOrLimit.call(executeFunctionsMock, qs);

		expect(qs.count).toBe(10);
	});
});

describe('Splunk, parseXml', () => {
	test('should parse valid XML string correctly', async () => {
		const xmlString = '<root><name>John</name><age>30</age></root>';

		const result = await parseXml(xmlString);

		expect(result).toEqual({ root: { name: 'John', age: '30' } });
	});

	test('should throw an error if XML string is invalid', async () => {
		const xmlString = '<invalid-xml>';

		await expect(parseXml(xmlString)).rejects.toThrow();
	});
});
