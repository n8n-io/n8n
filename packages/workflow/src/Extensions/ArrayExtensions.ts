/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
// eslint-disable-next-line import/no-cycle
import { BaseExtension, ExtensionMethodHandler } from './Extensions';

export class ArrayExtensions extends BaseExtension<any[]> {
	methodMapping = new Map<string, ExtensionMethodHandler<any[]>>();

	constructor() {
		super();
		this.initializeMethodMap();
	}

	bind(mainArg: any[], extraArgs?: string[] | number[] | undefined) {
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
		this.methodMapping = new Map<string, (value: any[]) => boolean | string | Date | number>([
			['first', this.first],
			['last', this.last],
			['unique', this.unique],
		]);
	}

	first(value: any[]): any {
		return value[0];
	}

	last(value: any[]): any {
		return value[value.length - 1];
	}

	unique(value: any[]): any[] {
		return Array.from(new Set(value));
	}
}
