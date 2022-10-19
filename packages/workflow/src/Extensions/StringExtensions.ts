/* eslint-disable @typescript-eslint/unbound-method */
// import { createHash } from 'crypto';
import * as ExpressionError from '../ExpressionError';
import { ExtensionMap } from './Extensions';
import CryptoJS from 'crypto-js';
import { encode } from 'js-base64';

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

function encrypt(value: string, extraArgs?: unknown): string {
	const [format = 'MD5'] = extraArgs as string[];
	if (format.toLowerCase() === 'base64') {
		// We're using a library instead of btoa because btoa only
		// works on ASCII
		return encode(value);
	}
	const hashFunction = hashFunctions[format.toLowerCase()];
	if (!hashFunction) {
		throw new ExpressionError.ExpressionExtensionError(
			`Unknown encrypt type ${format}. Available types are: ${Object.keys(hashFunctions)
				.map((s) => s.toUpperCase())
				.join(', ')}, and Base64.`,
		);
	}
	return hashFunction(value.toString()).toString();
	// return createHash(format).update(value.toString()).digest('hex');
}

function getOnlyFirstCharacters(value: string, extraArgs: number[]): string {
	const [end] = extraArgs;

	if (typeof end !== 'number') {
		throw new ExpressionError.ExpressionExtensionError(
			`getOnlyFirstCharacters() requires a argument`,
		);
	}

	return value.slice(0, end);
}

function isBlank(value: string): boolean {
	return value === '';
}

function isPresent(value: string): boolean {
	return !isBlank(value);
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

function sayHi(value: string) {
	return `hi ${value}`;
}

function stripTags(value: string): string {
	return value.replace(/<[^>]*>?/gm, '');
}

function toDate(value: string): Date {
	return new Date(value.toString());
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

export const stringExtensions: ExtensionMap = {
	typeName: 'String',
	functions: {
		encrypt,
		hash: encrypt,
		getOnlyFirstCharacters,
		removeMarkdown,
		sayHi,
		stripTags,
		toDate,
		urlDecode,
		urlEncode,
		length,
		isBlank,
		isPresent,
	},
};
