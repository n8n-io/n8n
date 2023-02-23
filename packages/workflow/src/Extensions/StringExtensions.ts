/* eslint-disable @typescript-eslint/unbound-method */
// import { createHash } from 'crypto';
import { titleCase } from 'title-case';
import * as ExpressionError from '../ExpressionError';
import type { ExtensionMap } from './Extensions';
import CryptoJS from 'crypto-js';
import { encode } from 'js-base64';
import { transliterate } from 'transliteration';

const hashFunctions: Record<string, typeof CryptoJS.MD5> = {
	md5: CryptoJS.MD5,
	sha1: CryptoJS.SHA1,
	sha224: CryptoJS.SHA224,
	sha256: CryptoJS.SHA256,
	sha384: CryptoJS.SHA384,
	sha512: CryptoJS.SHA512,
	sha3: CryptoJS.SHA3,
	ripemd160: CryptoJS.RIPEMD160,
};

// All symbols from https://www.xe.com/symbols/ as for 2022/11/09
const CURRENCY_REGEXP =
	/(\u004c\u0065\u006b|\u060b|\u0024|\u0192|\u20bc|\u0042\u0072|\u0042\u005a\u0024|\u0024\u0062|\u004b\u004d|\u0050|\u043b\u0432|\u0052\u0024|\u17db|\u00a5|\u20a1|\u006b\u006e|\u20b1|\u004b\u010d|\u006b\u0072|\u0052\u0044\u0024|\u00a3|\u20ac|\u00a2|\u0051|\u004c|\u0046\u0074|\u20b9|\u0052\u0070|\ufdfc|\u20aa|\u004a\u0024|\u20a9|\u20ad|\u0434\u0435\u043d|\u0052\u004d|\u20a8|\u20ae|\u004d\u0054|\u0043\u0024|\u20a6|\u0042\u002f\u002e|\u0047\u0073|\u0053\u002f\u002e|\u007a\u0142|\u006c\u0065\u0069|\u20bd|\u0414\u0438\u043d\u002e|\u0053|\u0052|\u0043\u0048\u0046|\u004e\u0054\u0024|\u0e3f|\u0054\u0054\u0024|\u20ba|\u20b4|\u0024\u0055|\u0042\u0073|\u20ab|\u005a\u0024)/gu;
const DOMAIN_REGEXP = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;

// This won't validate or catch literally valid email address, just what most people
// would expect
const EMAIL_REGEXP =
	/(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@(?<domain>(\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

// This also might not catch every possible URL
const URL_REGEXP =
	/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{2,}\b([-a-zA-Z0-9()\[\]@:%_\+.~#?&//=]*)/;

const CHAR_TEST_REGEXP = /\p{L}/u;
const PUNC_TEST_REGEXP = /[!?.]/;

function hash(value: string, extraArgs?: unknown): string {
	const [algorithm = 'MD5'] = extraArgs as string[];
	if (algorithm.toLowerCase() === 'base64') {
		// We're using a library instead of btoa because btoa only
		// works on ASCII
		return encode(value);
	}
	const hashFunction = hashFunctions[algorithm.toLowerCase()];
	if (!hashFunction) {
		throw new ExpressionError.ExpressionExtensionError(
			`Unknown algorithm ${algorithm}. Available algorithms are: ${Object.keys(hashFunctions)
				.map((s) => s.toUpperCase())
				.join(', ')}, and Base64.`,
		);
	}
	return hashFunction(value.toString()).toString();
	// return createHash(format).update(value.toString()).digest('hex');
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
		throw new ExpressionError.ExpressionExtensionError('cannot convert to date');
	}
	// If time component is not specified, force 00:00h
	if (!/:/.test(value)) {
		date.setHours(0, 0, 0);
	}
	return date;
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
		throw new ExpressionError.ExpressionExtensionError('cannot convert to integer');
	}

	return int;
}

function toFloat(value: string) {
	if (value.includes(',')) {
		throw new ExpressionError.ExpressionExtensionError(
			'cannot convert to float, expected . as decimal separator',
		);
	}

	const float = parseFloat(value.replace(CURRENCY_REGEXP, ''));

	if (isNaN(float)) {
		throw new ExpressionError.ExpressionExtensionError('cannot convert to float');
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
	let url: URL;
	try {
		url = new URL(value);
	} catch (_error) {
		return false;
	}

	// URL constructor tolerates missing `//` after protocol so check manually
	for (const scheme of ['http:', 'https:']) {
		if (
			url.protocol === scheme &&
			value.slice(scheme.length, scheme.length + '//'.length) === '//'
		) {
			return true;
		}
	}

	return false;
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
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			current[charIndex]!.toLocaleUpperCase() +
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
	} else if (isUrl(value)) {
		return new URL(value).hostname;
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

removeMarkdown.doc = {
	name: 'removeMarkdown',
	description: 'Removes Markdown formatting from a string.',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-removeMarkdown',
};

removeTags.doc = {
	name: 'removeTags',
	description: 'Removes tags, such as HTML or XML, from a string.',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-removeTags',
};

toDate.doc = {
	name: 'toDate',
	description: 'Converts a string to a date.',
	returnType: 'Date',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-toDate',
};

toFloat.doc = {
	name: 'toFloat',
	description: 'Converts a string to a decimal number.',
	returnType: 'number',
	aliases: ['toDecimalNumber'],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-toDecimalNumber',
};

toInt.doc = {
	name: 'toInt',
	description: 'Converts a string to an integer.',
	returnType: 'number',
	args: [{ name: 'radix?', type: 'number' }],
	aliases: ['toWholeNumber'],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-toInt',
};

toSentenceCase.doc = {
	name: 'toSentenceCase',
	description: 'Formats a string to sentence case. Example: "This is a sentence".',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-toSentenceCase',
};

toSnakeCase.doc = {
	name: 'toSnakeCase',
	description: 'Formats a string to snake case. Example: "this_is_snake_case".',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-toSnakeCase',
};

toTitleCase.doc = {
	name: 'toTitleCase',
	description: 'Formats a string to title case. Example: "This Is a Title".',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-toTitleCase',
};

urlEncode.doc = {
	name: 'urlEncode',
	description: 'Encodes a string to be used/included in a URL.',
	args: [{ name: 'entireString?', type: 'boolean' }],
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-urlEncode',
};

urlDecode.doc = {
	name: 'urlDecode',
	description:
		'Decodes a URL-encoded string. It decodes any percent-encoded characters in the input string, and replaces them with their original characters.',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-urlDecode',
};

replaceSpecialChars.doc = {
	name: 'replaceSpecialChars',
	description: 'Replaces non-ASCII characters in a string with an ASCII representation.',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-replaceSpecialChars',
};

length.doc = {
	name: 'length',
	description: 'Returns the character count of a string.',
	returnType: 'number',
	docURL: 'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings',
};

isDomain.doc = {
	name: 'isDomain',
	description: 'Checks if a string is a domain.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-isDomain',
};

isEmail.doc = {
	name: 'isEmail',
	description: 'Checks if a string is an email.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-isEmail',
};

isNumeric.doc = {
	name: 'isEmail',
	description: 'Checks if a string only contains digits.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-isNumeric',
};

isUrl.doc = {
	name: 'isUrl',
	description: 'Checks if a string is a valid URL.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-isUrl',
};

isEmpty.doc = {
	name: 'isEmpty',
	description: 'Checks if a string is empty.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-isEmpty',
};

isNotEmpty.doc = {
	name: 'isNotEmpty',
	description: 'Checks if a string has content.',
	returnType: 'boolean',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-isNotEmpty',
};

extractEmail.doc = {
	name: 'extractEmail',
	description: 'Extracts an email from a string. Returns undefined if none is found.',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-extractEmail',
};

extractDomain.doc = {
	name: 'extractDomain',
	description:
		'Extracts a domain from a string containing a valid URL. Returns undefined if none is found.',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-extractDomain',
};

extractUrl.doc = {
	name: 'extractUrl',
	description: 'Extracts a URL from a string. Returns undefined if none is found.',
	returnType: 'string',
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-extractUrl',
};

hash.doc = {
	name: 'hash',
	description: 'Returns a string hashed with the given algorithm. Default algorithm is `md5`.',
	returnType: 'string',
	args: [{ name: 'algo?', type: 'Algorithm' }],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-hash',
};

quote.doc = {
	name: 'quote',
	description: 'Returns a string wrapped in the quotation marks. Default quotation is `"`.',
	returnType: 'string',
	args: [{ name: 'mark?', type: 'string' }],
	docURL:
		'https://docs.n8n.io/code-examples/expressions/data-transformation-functions/strings/#string-quote',
};

export const stringExtensions: ExtensionMap = {
	typeName: 'String',
	functions: {
		hash,
		removeMarkdown,
		removeTags,
		toDate,
		toDecimalNumber: toFloat,
		toFloat,
		toInt,
		toWholeNumber: toInt,
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
	},
};
