import { convert } from 'html-to-text';
import type { IDataObject } from 'n8n-workflow';

import type { IValueData, Cheerio } from './types';

// The extraction functions
const extractFunctions: {
	[key: string]: ($: Cheerio, valueData: IValueData, nodeVersion: number) => string | undefined;
} = {
	attribute: ($: Cheerio, valueData: IValueData): string | undefined =>
		$.attr(valueData.attribute!),
	html: ($: Cheerio, _valueData: IValueData): string | undefined => $.html() || undefined,
	text: ($: Cheerio, _valueData: IValueData, nodeVersion: number): string | undefined => {
		if (nodeVersion <= 1.1) return $.text() || undefined;

		const html = $.html() || '';

		let options;
		if (_valueData.skipSelectors) {
			options = {
				selectors: _valueData.skipSelectors.split(',').map((s) => ({
					selector: s.trim(),
					format: 'skip',
				})),
			};
		}
		return convert(html, options);
	},
	value: ($: Cheerio, _valueData: IValueData): string | undefined => $.val(),
};

/**
 * Simple helper function which applies options
 */
export function getValue(
	$: Cheerio,
	valueData: IValueData,
	options: IDataObject,
	nodeVersion: number,
) {
	let value = extractFunctions[valueData.returnValue]($, valueData, nodeVersion);

	if (value === undefined) {
		return value;
	}

	if (options.trimValues) {
		value = value.trim();
	}

	if (options.cleanUpText) {
		value = value
			.replace(/^\s+|\s+$/g, '')
			.replace(/(\r\n|\n|\r)/gm, '')
			.replace(/\s+/g, ' ');
	}

	return value;
}
