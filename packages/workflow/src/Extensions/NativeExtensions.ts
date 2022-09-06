/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/no-cycle
// import * as ExpressionError from '../ExpressionError';
import { DateTime, DateTimeJSOptions, LocaleOptions } from 'luxon';
import { BaseExtension, ExtensionMethodHandler } from './Extensions';

export class DateTimeExtensions extends BaseExtension<
	DateTime | LocaleOptions | DateTimeJSOptions
> {
	methodMapping = new Map<
		string,
		ExtensionMethodHandler<DateTime | LocaleOptions | DateTimeJSOptions>
	>();

	constructor() {
		super();
		this.initializeMethodMap();
	}

	bind(mainArg: DateTime, extraArgs?: Array<number | LocaleOptions> | undefined) {
		return Array.from(this.methodMapping).reduce((p, c) => {
			const [key, method] = c;
			Object.assign(p, {
				[key]: () => {
					return method.call(DateTime, mainArg, extraArgs);
				},
			});
			return p;
		}, {} as object);
	}

	private initializeMethodMap(): void {
		this.methodMapping = new Map<
			string,
			(
				value: DateTime | LocaleOptions | DateTimeJSOptions | string | number[],
			) => DateTime | boolean | string | Date | number
		>([]);
	}

	utc(mainArg: number[], opts: Array<number | LocaleOptions>) {
		return DateTime.utc.call(DateTime, opts);
	}

	local(mainArg: number[], opts: DateTimeJSOptions) {
		return DateTime.local.call(DateTime, mainArg, opts);
	}
}
