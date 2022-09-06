export type ExtensionMethodHandler<K> = (
	value: K,
	args?: K | K[] | number[] | string[] | boolean[] | undefined,
) => K | string | Date | boolean | number;

export abstract class BaseExtension<T> {
	methodMapping: Map<string, ExtensionMethodHandler<T>>;

	constructor() {
		this.methodMapping = new Map<string, ExtensionMethodHandler<T>>();
	}

	hasMethod(methodName: string): boolean {
		return this.methodMapping.has(methodName);
	}

	listMethods(): string[] {
		return Array.from(this.methodMapping.keys());
	}

	methods() {
		return Object.fromEntries(this.methodMapping.entries());
	}
}
