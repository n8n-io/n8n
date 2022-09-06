/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import removeMd from 'remove-markdown';
import { createHash } from 'crypto';
// eslint-disable-next-line import/no-cycle
import * as ExpressionError from '../ExpressionError';
import { BaseExtension, ExtensionMethodHandler } from './Extensions';

export class StringExtensions extends BaseExtension<string> {
	methodMapping = new Map<string, ExtensionMethodHandler<string>>();

	constructor() {
		super();
		this.initializeMethodMap();
	}

	bind(mainArg: string, extraArgs?: number[] | string[] | boolean[] | undefined) {
		return Array.from(this.methodMapping).reduce((p, c) => {
			const [key, method] = c;
			Object.assign(p, {
				[key]: () => {
					return method.call('', mainArg, extraArgs);
				},
			});
			return p;
		}, {} as object);
	}

	private initializeMethodMap(): void {
		this.methodMapping = new Map<
			string,
			(
				value: string,
				extraArgs?: string | number[] | string[] | boolean[] | undefined,
			) => boolean | string | Date | number
		>([
			['encrypt', this.encrypt],
			['getOnlyFirstCharacters', this.getOnlyFirstCharacters],
			['hash', this.encrypt],
			['isPresent', this.isPresent],
			['length', this.length],
			['removeMarkdown', this.removeMarkdown],
			['stripTags', this.stripTags],
			['toDate', this.toDate],
			['urlDecode', this.urlDecode],
			['urlEncode', this.urlEncode],
		]);
	}

	encrypt(value: string, extraArgs?: any): string {
		const [format = 'MD5'] = extraArgs as string[];
		return createHash(format).update(value.toString()).digest('hex');
	}

	getOnlyFirstCharacters(value: string, extraArgs?: any): string {
		if (typeof value !== 'string') {
			throw new ExpressionError.ExpressionExtensionError(
				'getOnlyFirstCharacters() requires a string-type main arg',
			);
		}

		if (!extraArgs || (Array.isArray(extraArgs) && extraArgs.length > 1)) {
			throw new ExpressionError.ExpressionExtensionError(
				'getOnlyFirstCharacters() requires a single extra arg',
			);
		}

		// default to entire string length
		const [extraArg = value.length] = extraArgs as number[];

		return value.slice(0, extraArg);
	}

	isBlank(value: string): boolean {
		return value === '';
	}

	isPresent(value: string): boolean {
		return !this.isBlank(value);
	}

	length(value: string): number {
		return value.length;
	}

	removeMarkdown(value: string): string {
		return removeMd(value);
	}

	stripTags(value: string): string {
		return value.replace(/<[^>]*>?/gm, '');
	}

	toDate(value: string): Date {
		return new Date(value.toString());
	}

	urlDecode(value: string, extraArgs?: any): string {
		const [entireString = false] = extraArgs as boolean[];
		if (entireString) {
			return decodeURI(value.toString());
		}
		return decodeURIComponent(value.toString());
	}

	urlEncode(value: string, extraArgs?: any): string {
		const [entireString = false] = extraArgs as boolean[];
		if (entireString) {
			return encodeURI(value.toString());
		}
		return encodeURIComponent(value.toString());
	}
}
