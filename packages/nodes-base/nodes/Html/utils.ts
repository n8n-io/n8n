import type { IDataObject } from 'n8n-workflow';
import type { IValueData, Cheerio } from './types';

// The extraction functions
const extractFunctions: {
	[key: string]: ($: Cheerio, valueData: IValueData) => string | undefined;
} = {
	attribute: ($: Cheerio, valueData: IValueData): string | undefined =>
		$.attr(valueData.attribute!),

	html: ($: Cheerio, _valueData: IValueData): string | undefined => $.html() || undefined,
	text: ($: Cheerio, _valueData: IValueData): string | undefined => $.text(),
	value: ($: Cheerio, _valueData: IValueData): string | undefined => $.val(),
};

/**
 * Simple helper function which applies options
 */
export function getValue($: Cheerio, valueData: IValueData, options: IDataObject) {
	const value = extractFunctions[valueData.returnValue]($, valueData);
	if (options.trimValues === false || value === undefined) {
		return value;
	}

	return value.trim();
}
