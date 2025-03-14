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

interface BigInt {
	toJSON(): string;
}

declare module 'js-base64' {
	export function toBase64(input: string): string;
	export function fromBase64(input: string): string;
}
