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

	bind(mainArg: string, extraArgs?: Array<number | string | boolean> | undefined) {
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
		this.methodMapping = new Map<string, (value: string) => boolean | string | Date>([
			['encrypt', this.encrypt],
			['getOnlyFirstCharacters', this.getOnlyFirstCharacters],
			['hash', this.encrypt],
			// ['isBlank', this.isBlank], // ommited from here because it's a utility method other types also have.
			['isPresent', this.isPresent],
			['removeMarkdown', this.removeMarkdown],
			['stripTags', this.stripTags],
			['toDate', this.toDate],
			['urlDecode', this.urlDecode],
			['urlEncode', this.urlEncode],
		]);
	}

	encrypt(value: string, extraArgs = []): string {
		const [format = 'MD5'] = extraArgs;
		return createHash(format).update(value.toString()).digest('hex');
	}

	getOnlyFirstCharacters(value: string, extraArgs = []): string {
		if (typeof value !== 'string') {
			throw new ExpressionError.ExpressionExtensionError(
				'getOnlyFirstCharacters() requires a string-type main arg',
			);
		}

		if (!extraArgs || extraArgs.length > 1) {
			throw new ExpressionError.ExpressionExtensionError(
				'getOnlyFirstCharacters() requires a single extra arg',
			);
		}

		const [extraArg = value.length] = extraArgs;

		return value.slice(0, extraArg);
	}

	isBlank(value: string): boolean {
		return value === '';
	}

	isPresent(value: string): boolean {
		return !this.isBlank(value);
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

	urlDecode(value: string, entireString = false): string {
		if (entireString) {
			return decodeURI(value.toString());
		}
		return decodeURIComponent(value.toString());
	}

	urlEncode(value: string, entireString = false): string {
		if (entireString) {
			return encodeURI(value.toString());
		}
		return encodeURIComponent(value.toString());
	}
}
