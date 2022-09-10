/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/no-cycle
import { BaseExtension, ExtensionMethodHandler } from './Extensions';

export class NumberExtensions extends BaseExtension<number> {
	methodMapping = new Map<string, ExtensionMethodHandler<number>>();

	constructor() {
		super();
		this.initializeMethodMap();
	}

	bind(mainArg: number, extraArgs?: number[] | string[] | boolean[] | undefined) {
		return Array.from(this.methodMapping).reduce((p, c) => {
			const [key, method] = c;
			Object.assign(p, {
				[key]: () => {
					return method.call(this, mainArg, extraArgs);
				},
			});
			return p;
		}, {} as object);
	}

	private initializeMethodMap(): void {
		this.methodMapping = new Map<
			string,
			(
				value: number,
				extraArgs?: number | number[] | string[] | boolean[] | undefined,
			) => boolean | string | Date | number
		>([]);
	}

	format(value: number, extraArgs?: any): string {
		const [locales = 'en-US', config] = extraArgs as [
			string | string[],
			{ compactDisplay: string; notation: string; style: string },
		];

		return new Intl.NumberFormat(locales, {
			...config,
			notation: 'compact',
			compactDisplay: 'short',
			style: 'decimal',
		}).format(value);
	}

	isBlank(value: number): boolean {
		return value == null || typeof value !== 'number';
	}

	isPresent(value: number): boolean {
		return !this.isBlank(value);
	}

	random(value: number): number {
		return Math.floor(Math.random() * value);
	}
}
