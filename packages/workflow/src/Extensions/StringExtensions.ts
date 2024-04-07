import SHA from 'jssha';
import MD5 from 'md5';
import { toBase64, fromBase64 } from 'js-base64';
import { titleCase } from 'title-case';
import type { Extension, ExtensionMap } from './Extensions';
import { transliterate } from 'transliteration';
import { ExpressionExtensionError } from '../errors/expression-extension.error';
import type { DateTime } from 'luxon';
import { tryToParseDateTime } from '../TypeValidation';

export const SupportedHashAlgorithms = [
	'md5',
	'sha1',
	'sha224',
	'sha256',
	'sha384',
	'sha512',
	'sha3',
] as const;

// All symbols from https://www.xe.com/symbols/ as for 2022/11/09
const CURRENCY_REGEXP =
	/(\u004c\u0065\u006b|\u060b|\u0024|\u0192|\u20bc|\u0042\u0072|\u0042\u005a\u0024|\u0024\u0062|\u004b\u004d|\u0050|\u043b\u0432|\u0052\u0024|\u17db|\u00a5|\u20a1|\u006b\u006e|\u20b1|\u004b\u010d|\u006b\u0072|\u0052\u0044\u0024|\u00a3|\u20ac|\u00a2|\u0051|\u004c|\u0046\u0074|\u20b9|\u0052\u0070|\ufdfc|\u20aa|\u004a\u0024|\u20a9|\u20ad|\u0434\u0435\u043d|\u0052\u004d|\u20a8|\u20ae|\u004d\u0054|\u0043\u0024|\u20a6|\u0042\u002f\u002e|\u0047\u0073|\u0053\u002f\u002e|\u007a\u0142|\u006c\u0065\u0069|\u20bd|\u0414\u0438\u043d\u002e|\u0053|\u0052|\u0043\u0048\u0046|\u004e\u0054\u0024|\u0e3f|\u0054\u0054\u0024|\u20ba|\u20b4|\u0024\u0055|\u0042\u0073|\u20ab|\u005a\u0024)/gu;

/*
	Extract the domain part from various inputs, including URLs, email addresses, and plain domains.

	/^(?:(?:https?|ftp):\/\/)? 								// Match optional http, https, or ftp protocols
  (?:mailto:)?               								// Match optional mailto:
  (?:\/\/)?                  								// Match optional double slashes
  (?:www\.)?                 								// Match optional www prefix
  (?:[-\w]*\.)?              								// Match any optional subdomain
  (                           							// Capture the domain part
    (?:(?:[-\w]+\.)+          							// Match one or more subdomains
      (?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+) 		// Match top-level domain or Punycode encoded IDN(xn--80aswg.xn--p1ai)
      |localhost              							// Match localhost
      |\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3} 	// Match IPv4 addresses
    )
  )
  (?::\d+)?                   							// Match optional port number
  (?:\/[^\s?]*)?              							// Match optional path
  (?:\?[^\s#]*)?              							// Match optional query string
  (?:#[^\s]*)?$/i;            							// Match optional hash fragment
*/
const DOMAIN_EXTRACT_REGEXP =
	/^(?:(?:https?|ftp):\/\/)?(?:mailto:)?(?:\/\/)?((?:www\.)?(?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?]*)?(?:\?[^\s#]*)?(?:#[^\s]*)?$/i;

/*
	Matches domain names without the protocol or optional subdomains

	/^(?:www\.)? 															// Match optional www prefix
  (                         								// Capture the domain part
    (?:(?:[-\w]+\.)+        								// Match one or more subdomains
      (?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+) 		// Match top-level domain or Punycode encoded IDN
      |localhost            								// Match localhost
      |\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3} 	// Match IPv4 addresses
    )
  )
  (?::\d+)?                 								// Match optional port number
  (?:\/[^\s?]*)?            								// Match optional path
  (?:\?[^\s#]*)?            								// Match optional query string
  (?:#[^\s]*)?$/i;          								// Match optional fragment at the end of the string
*/
const DOMAIN_REGEXP =
	/^(?:www\.)?((?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?]*)?(?:\?[^\s#]*)?(?:#[^\s]*)?$/i;

/*
	Matches email addresses

	/(
    ( 																											// Capture local part of the email address
      ([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*) 	// One or more characters not in the set, followed by
																														a	period, followed by one or more characters not in the set
      |(".+") 																							// Or one or more characters inside quotes
    )
  )
  @                             														// Match @ symbol
  (?<domain>(                   														// Capture the domain part of the email address
    \[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\] 			// Match IPv4 address inside brackets
    |(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}) 											// Or match domain with at least two subdomains and TLD
  ))/;
*/
const EMAIL_REGEXP =
	/(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(?<domain>(\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

/*
	Matches URLs with strict beginning and end of the string checks

	/^(?:(?:https?|ftp):\/\/) 							// Match http, https, or ftp protocols at the start of the string
  (?:www\.)?               								// Match optional www prefix
  (                        								// Capture the domain part
    (?:(?:[-\w]+\.)+       								// Match one or more subdomains
      (?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+) 	// Match top-level domain or Punycode encoded IDN
      |localhost           								// Match localhost
      |\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3} // Match IPv4 addresses
    )
  )
  (?::\d+)?                								// Match optional port number
  (?:\/[^\s?#]*)?          								// Match optional path
  (?:\?[^\s#]*)?           								// Match optional query string
  (?=([^\s]+#.*)?)         								// Positive lookahead for the fragment identifier
  #?[^\s]*$/i;              							// Match optional fragment at the end of the string
*/
const URL_REGEXP_EXACT =
	/^(?:(?:https?|ftp):\/\/)(?:www\.)?((?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?#]*)?(?:\?[^\s#]*)?(?=([^\s]+#.*)?)#?[^\s]*$/i;

/*
	Same as URL_REGEXP_EXACT but without the strict beginning and end of the string checks to allow for
	matching URLs in the middle of a string
*/
const URL_REGEXP =
	/(?:(?:https?|ftp):\/\/)(?:www\.)?((?:(?:[-\w]+\.)+(?:[a-zA-Z]{2,}|xn--[a-zA-Z0-9]+)|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::\d+)?(?:\/[^\s?#]*)?(?:\?[^\s#]*)?(?=([^\s]+#.*)?)#?[^\s]*/i;

const CHAR_TEST_REGEXP = /\p{L}/u;
const PUNC_TEST_REGEXP = /[!?.]/;

function hash(value: string, extraArgs: string[]): string {
	const algorithm = extraArgs[0]?.toLowerCase() ?? 'md5';
	switch (algorithm) {
		case 'base64':
			return toBase64(value);
		case 'md5':
			return MD5(value);
		case 'sha1':
		case 'sha224':
		case 'sha256':
		case 'sha384':
		case 'sha512':
		case 'sha3':
			const variant = (
				{
					sha1: 'SHA-1',
					sha224: 'SHA-224',
					sha256: 'SHA-256',
					sha384: 'SHA-384',
					sha512: 'SHA-512',
					sha3: 'SHA3-512',
				} as const
			)[algorithm];
			return new SHA(variant, 'TEXT').update(value).getHash('HEX');
		default:
			throw new ExpressionExtensionError(
				`Unknown algorithm ${algorithm}. Available algorithms are: ${SupportedHashAlgorithms.join()}, and Base64.`,
			);
	}
}

function isEmpty(value: string): boolean {
	return value === '';
}

function isNotEmpty(value: string): boolean {
	return !isEmpty(value);
}

function length(value: string): number {
	return value.length;
}

function removeMarkdown(value: string): string {
	let output = value;
	try {
		output = output.replace(/^([\s\t]*)([*\-+]|\d\.)\s+/gm, '$1');

		output = output
			// Header
			.replace(/\n={2,}/g, '\n')
			// Strikethrough
			.replace(/~~/g, '')
			// Fenced codeblocks
			.replace(/`{3}.*\n/g, '');

		output = output
			// Remove HTML tags
			.replace(/<[\w|\s|=|'|"|:|(|)|,|;|/|0-9|.|-]+[>|\\>]/g, '')
			// Remove setext-style headers
			.replace(/^[=-]{2,}\s*$/g, '')
			// Remove footnotes?
			.replace(/\[\^.+?\](: .*?$)?/g, '')
			.replace(/\s{0,2}\[.*?\]: .*?$/g, '')
			// Remove images
			.replace(/!\[.*?\][[(].*?[\])]/g, '')
			// Remove inline links
			.replace(/\[(.*?)\][[(].*?[\])]/g, '$1')
			// Remove Blockquotes
			.replace(/>/g, '')
			// Remove reference-style links?
			.replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
			// Remove atx-style headers
			.replace(/^#{1,6}\s*([^#]*)\s*(#{1,6})?/gm, '$1')
			.replace(/([*_]{1,3})(\S.*?\S)\1/g, '$2')
			.replace(/(`{3,})(.*?)\1/gm, '$2')
			.replace(/^-{3,}\s*$/g, '')
			.replace(/`(.+?)`/g, '$1')
			.replace(/\n{2,}/g, '\n\n');
	} catch (e) {
		return value;
	}
	return output;
}

function removeTags(value: string): string {
	return value.replace(/<[^>]*>?/gm, '');
}

function toDate(value: string): Date {
	const date = new Date(Date.parse(value));

	if (date.toString() === 'Invalid Date') {
		throw new ExpressionExtensionError('cannot convert to date');
	}
	// If time component is not specified, force 00:00h
	if (!/:/.test(value)) {
		date.setHours(0, 0, 0);
	}
	return date;
}

function toDateTime(value: string): DateTime {
	try {
		return tryToParseDateTime(value);
	} catch (error) {
		throw new ExpressionExtensionError('cannot convert to Luxon DateTime');
	}
}

function urlDecode(value: string, extraArgs: boolean[]): string {
	const [entireString = false] = extraArgs;
	if (entireString) {
		return decodeURI(value.toString());
	}
	return decodeURIComponent(value.toString());
}

function urlEncode(value: string, extraArgs: boolean[]): string {
	const [entireString = false] = extraArgs;
	if (entireString) {
		return encodeURI(value.toString());
	}
	return encodeURIComponent(value.toString());
}

function toInt(value: string, extraArgs: Array<number | undefined>) {
	const [radix] = extraArgs;
	const int = parseInt(value.replace(CURRENCY_REGEXP, ''), radix);

	if (isNaN(int)) {
		throw new ExpressionExtensionError('cannot convert to integer');
	}

	return int;
}

function toFloat(value: string) {
	if (value.includes(',')) {
		throw new ExpressionExtensionError('cannot convert to float, expected . as decimal separator');
	}

	const float = parseFloat(value.replace(CURRENCY_REGEXP, ''));

	if (isNaN(float)) {
		throw new ExpressionExtensionError('cannot convert to float');
	}

	return float;
}

function quote(value: string, extraArgs: string[]) {
	const [quoteChar = '"'] = extraArgs;
	return `${quoteChar}${value
		.replace(/\\/g, '\\\\')
		.replace(new RegExp(`\\${quoteChar}`, 'g'), `\\${quoteChar}`)}${quoteChar}`;
}

function isNumeric(value: string) {
	if (value.includes(' ')) return false;

	return !isNaN(value as unknown as number) && !isNaN(parseFloat(value));
}

function isUrl(value: string) {
	return URL_REGEXP_EXACT.test(value);
}

function isDomain(value: string) {
	return DOMAIN_REGEXP.test(value);
}

function isEmail(value: string) {
	const result = EMAIL_REGEXP.test(value);

	// email regex is loose so check manually for now
	if (result && value.includes(' ')) {
		return false;
	}

	return result;
}

function toTitleCase(value: string) {
	return titleCase(value);
}

function replaceSpecialChars(value: string) {
	return transliterate(value, { unknown: '?' });
}

function toSentenceCase(value: string) {
	let current = value.slice();
	let buffer = '';

	while (CHAR_TEST_REGEXP.test(current)) {
		const charIndex = current.search(CHAR_TEST_REGEXP);
		current =
			current.slice(0, charIndex) +
			current[charIndex].toLocaleUpperCase() +
			current.slice(charIndex + 1).toLocaleLowerCase();
		const puncIndex = current.search(PUNC_TEST_REGEXP);
		if (puncIndex === -1) {
			buffer += current;
			current = '';
			break;
		}
		buffer += current.slice(0, puncIndex + 1);
		current = current.slice(puncIndex + 1);
	}

	return buffer;
}

function toSnakeCase(value: string) {
	return value
		.toLocaleLowerCase()
		.replace(/[ \-]/g, '_')
		.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,.\/:;<=>?@\[\]^`{|}~]/g, '');
}

function extractEmail(value: string) {
	const matched = EMAIL_REGEXP.exec(value);
	if (!matched) {
		return undefined;
	}
	return matched[0];
}

function extractDomain(value: string) {
	if (isEmail(value)) {
		const matched = EMAIL_REGEXP.exec(value);
		// This shouldn't happen
		if (!matched) {
			return undefined;
		}
		return matched.groups?.domain;
	}

	const domainMatch = value.match(DOMAIN_EXTRACT_REGEXP);
	if (domainMatch) {
		return domainMatch[1];
	}

	return undefined;
}

function extractUrl(value: string) {
	const matched = URL_REGEXP.exec(value);
	if (!matched) {
		return undefined;
	}
	return matched[0];
}

function extractUrlPath(value: string) {
	try {
		const url = new URL(value);
		return url.pathname;
	} catch (error) {
		return undefined;
	}
}

function parseJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch (error) {
		if (value.includes("'")) {
			throw new ExpressionExtensionError("Parsing failed. Check you're using double quotes");
		}
		throw new ExpressionExtensionError('Parsing failed');
	}
}

function toBoolean(value: string): boolean {
	const normalized = value.toLowerCase();
	const FALSY = new Set(['false', 'no', '0']);
	return normalized.length > 0 && !FALSY.has(normalized);
}

function base64Encode(value: string): string {
	return toBase64(value);
}

function base64Decode(value: string): string {
	return fromBase64(value);
}

removeMarkdown.doc = {
	name: 'removeMarkdown',
	description: 'Removes Markdown formatting from a string.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-removeMarkdown',
};

removeTags.doc = {
	name: 'removeTags',
	description: 'Removes tags, such as HTML or XML, from a string.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-removeTags',
};

toDate.doc = {
	name: 'toDate',
	description: 'Converts a string to a date.',
	section: 'cast',
	returnType: 'Date',
	hidden: true,
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toDate',
};

toDateTime.doc = {
	name: 'toDateTime',
	description: 'Converts a string to a Luxon DateTime.',
	section: 'cast',
	returnType: 'DateTime',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toDateTime',
};

toBoolean.doc = {
	name: 'toBoolean',
	description: 'Converts a string to a boolean.',
	section: 'cast',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toBoolean',
};

toFloat.doc = {
	name: 'toFloat',
	description: 'Converts a string to a decimal number.',
	section: 'cast',
	returnType: 'number',
	aliases: ['toDecimalNumber'],
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toDecimalNumber',
};

toInt.doc = {
	name: 'toInt',
	description: 'Converts a string to an integer.',
	section: 'cast',
	returnType: 'number',
	args: [{ name: 'radix?', type: 'number' }],
	aliases: ['toWholeNumber'],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toInt',
};

toSentenceCase.doc = {
	name: 'toSentenceCase',
	description: 'Formats a string to sentence case. Example: "This is a sentence".',
	section: 'case',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toSentenceCase',
};

toSnakeCase.doc = {
	name: 'toSnakeCase',
	description: 'Formats a string to snake case. Example: "this_is_snake_case".',
	section: 'case',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toSnakeCase',
};

toTitleCase.doc = {
	name: 'toTitleCase',
	description:
		'Formats a string to title case. Example: "This Is a Title". Will not change already uppercase letters to prevent losing information from acronyms and trademarks such as iPhone or FAANG.',
	section: 'case',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-toTitleCase',
};

urlEncode.doc = {
	name: 'urlEncode',
	description: 'Encodes a string to be used/included in a URL.',
	section: 'edit',
	args: [{ name: 'entireString?', type: 'boolean' }],
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-urlEncode',
};

urlDecode.doc = {
	name: 'urlDecode',
	description:
		'Decodes a URL-encoded string. It decodes any percent-encoded characters in the input string, and replaces them with their original characters.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-urlDecode',
};

replaceSpecialChars.doc = {
	name: 'replaceSpecialChars',
	description: 'Replaces non-ASCII characters in a string with an ASCII representation.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-replaceSpecialChars',
};

length.doc = {
	name: 'length',
	section: 'query',
	hidden: true,
	description: 'Returns the character count of a string.',
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings',
};

isDomain.doc = {
	name: 'isDomain',
	description: 'Checks if a string is a domain.',
	section: 'validation',
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-isDomain',
};

isEmail.doc = {
	name: 'isEmail',
	description: 'Checks if a string is an email.',
	section: 'validation',
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-isEmail',
};

isNumeric.doc = {
	name: 'isNumeric',
	description: 'Checks if a string only contains digits.',
	section: 'validation',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-isNumeric',
};

isUrl.doc = {
	name: 'isUrl',
	description: 'Checks if a string is a valid URL.',
	section: 'validation',
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-isUrl',
};

isEmpty.doc = {
	name: 'isEmpty',
	description: 'Checks if a string is empty.',
	section: 'validation',
	returnType: 'boolean',
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-isEmpty',
};

isNotEmpty.doc = {
	name: 'isNotEmpty',
	description: 'Checks if a string has content.',
	section: 'validation',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-isNotEmpty',
};

extractEmail.doc = {
	name: 'extractEmail',
	description: 'Extracts an email from a string. Returns undefined if none is found.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-extractEmail',
};

extractDomain.doc = {
	name: 'extractDomain',
	description:
		'Extracts a domain from a string containing a valid URL. Returns undefined if none is found.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-extractDomain',
};

extractUrl.doc = {
	name: 'extractUrl',
	description: 'Extracts a URL from a string. Returns undefined if none is found.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-extractUrl',
};

extractUrlPath.doc = {
	name: 'extractUrlPath',
	description: 'Extracts the path from a URL. Returns undefined if none is found.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-extractUrlPath',
};

hash.doc = {
	name: 'hash',
	description: 'Returns a string hashed with the given algorithm. Default algorithm is `md5`.',
	section: 'edit',
	returnType: 'string',
	args: [{ name: 'algo?', type: 'Algorithm' }],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-hash',
};

quote.doc = {
	name: 'quote',
	description: 'Returns a string wrapped in the quotation marks. Default quotation is `"`.',
	section: 'edit',
	returnType: 'string',
	args: [{ name: 'mark?', type: 'string' }],
	docURL: 'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-quote',
};

parseJson.doc = {
	name: 'parseJson',
	description:
		'Parses a JSON string, constructing the JavaScript value or object described by the string.',
	section: 'cast',
	returnType: 'any',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-parseJson',
};

base64Encode.doc = {
	name: 'base64Encode',
	description: 'Converts a UTF-8-encoded string to a Base64 string.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-base64Encode',
};

base64Decode.doc = {
	name: 'base64Decode',
	description: 'Converts a Base64 string to a UTF-8 string.',
	section: 'edit',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code/builtin/data-transformation-functions/strings/#string-base64Decode',
};

const toDecimalNumber: Extension = toFloat.bind({});
toDecimalNumber.doc = { ...toFloat.doc, hidden: true };
const toWholeNumber: Extension = toInt.bind({});
toWholeNumber.doc = { ...toInt.doc, hidden: true };

export const stringExtensions: ExtensionMap = {
	typeName: 'String',
	functions: {
		hash,
		removeMarkdown,
		removeTags,
		toDate,
		toDateTime,
		toBoolean,
		toDecimalNumber,
		toFloat,
		toInt,
		toWholeNumber,
		toSentenceCase,
		toSnakeCase,
		toTitleCase,
		urlDecode,
		urlEncode,
		quote,
		replaceSpecialChars,
		length,
		isDomain,
		isEmail,
		isNumeric,
		isUrl,
		isEmpty,
		isNotEmpty,
		extractEmail,
		extractDomain,
		extractUrl,
		extractUrlPath,
		parseJson,
		base64Encode,
		base64Decode,
	},
};
