/// <reference lib="es2022.error" />

declare module '@n8n_io/riot-tmpl' {
	interface Brackets {
		set(token: string): void;
	}

	type ReturnValue = string | null | (() => unknown);
	type TmplFn = (value: string, data: unknown) => ReturnValue;
	interface Tmpl extends TmplFn {
		errorHandler?(error: Error): void;
	}

	let brackets: Brackets;
	let tmpl: Tmpl;
}

declare module 'generate-schema' {
	export function json(schema: unknown): unknown;
}

interface BigInt {
	toJSON(): string;
}
