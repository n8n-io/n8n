import * as LoggerProxy from './logger-proxy';

const REGEX_TIMEOUT_MS = 250;
const REGEX_TIMEOUT_ERROR_MESSAGE = 'Regular expression execution timed out';

export interface RegexEngine {
	exec(pattern: string, input: string, flags?: string): RegExpExecArray | null;
	test(pattern: string, input: string, flags?: string): boolean;
	replace(pattern: string, input: string, flags: string | undefined, replacement: string): string;
	matchAll(pattern: string, input: string, flags?: string): RegExpMatchArray[];
	split(pattern: string, input: string, flags?: string): string[];
}

export interface RegexEngineAsync {
	exec(pattern: string, input: string, flags?: string): Promise<RegExpExecArray | null>;
	test(pattern: string, input: string, flags?: string): Promise<boolean>;
	replace(
		pattern: string,
		input: string,
		flags: string | undefined,
		replacement: string,
	): Promise<string>;
	matchAll(pattern: string, input: string, flags?: string): Promise<RegExpMatchArray[]>;
	split(pattern: string, input: string, flags?: string): Promise<string[]>;
}

export type RegexLiteral = {
	source: string;
	flags: string;
};

type VmContext = {
	flags: string;
	input: string;
	pattern: string;
	replacement: string;
	result: unknown;
};

type VmScript = {
	runInContext(context: object, options: { timeout: number }): unknown;
};

type VmModule = typeof import('node:vm');

let warnedAboutBrowserFallback = false;
let engine: RegexEngine;

export function parseRegexLiteral(value: string): RegexLiteral {
	const literal = value.toString();
	const match = /^\/(.*?)\/([gimusy]*)$/.exec(literal);
	if (!match) return { source: literal, flags: '' };
	return { source: match[1] ?? '', flags: match[2] ?? '' };
}

function globalFlag(flags?: string): string {
	return flags?.includes('g') ? flags : `${flags ?? ''}g`;
}

function isNodeRuntime(): boolean {
	const processValue = Reflect.get(globalThis, 'process');
	if (typeof processValue !== 'object' || processValue === null) return false;

	const versions = Reflect.get(processValue, 'versions');
	if (typeof versions !== 'object' || versions === null) return false;

	return typeof Reflect.get(versions, 'node') === 'string';
}

function loadNodeVm(): VmModule | undefined {
	if (!isNodeRuntime()) return undefined;

	const processValue = Reflect.get(globalThis, 'process');
	if (typeof processValue === 'object' && processValue !== null) {
		const getBuiltinModule = Reflect.get(processValue, 'getBuiltinModule');
		if (typeof getBuiltinModule === 'function') {
			const vmModule = getBuiltinModule('node:vm');
			if (vmModule) return vmModule;
		}
	}
}

function isTimeout(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		Reflect.get(error, 'code') === 'ERR_SCRIPT_EXECUTION_TIMEOUT'
	);
}

function nativeEngine(): RegexEngine {
	if (!warnedAboutBrowserFallback) {
		warnedAboutBrowserFallback = true;
		LoggerProxy.warn('Using native regular expression engine without timeout protection');
	}
	/* eslint-disable n8n-local-rules/no-dynamic-regexp -- isomorphic native fallback; backend overrides via setSafeRegexEngine */
	return {
		exec: (pattern, input, flags) => new RegExp(pattern, flags).exec(input),
		test: (pattern, input, flags) => new RegExp(pattern, flags).test(input),
		replace: (pattern, input, flags, replacement) =>
			input.replace(new RegExp(pattern, flags), replacement),
		matchAll: (pattern, input, flags) =>
			Array.from(input.matchAll(new RegExp(pattern, globalFlag(flags)))),
		split: (pattern, input, flags) => input.split(new RegExp(pattern, flags)),
	};
	/* eslint-enable n8n-local-rules/no-dynamic-regexp */
}

function nodeVmEngine(vm: VmModule): RegexEngine {
	const context: VmContext = {
		flags: '',
		input: '',
		pattern: '',
		replacement: '',
		result: undefined,
	};
	const vmContext = vm.createContext(context);
	const scripts = {
		exec: new vm.Script('result = new RegExp(pattern, flags).exec(input)'),
		test: new vm.Script('result = new RegExp(pattern, flags).test(input)'),
		replace: new vm.Script('result = input.replace(new RegExp(pattern, flags), replacement)'),
		matchAll: new vm.Script('result = Array.from(input.matchAll(new RegExp(pattern, flags)))'),
		split: new vm.Script('result = input.split(new RegExp(pattern, flags))'),
	};

	function run<T>(script: VmScript): T {
		try {
			script.runInContext(vmContext, { timeout: REGEX_TIMEOUT_MS });
			return context.result as T;
		} catch (error) {
			if (isTimeout(error)) throw new Error(REGEX_TIMEOUT_ERROR_MESSAGE);
			throw error;
		}
	}

	return {
		exec(pattern, input, flags) {
			context.pattern = pattern;
			context.flags = flags ?? '';
			context.input = input;
			context.result = undefined;
			return run<RegExpExecArray | null>(scripts.exec);
		},
		test(pattern, input, flags) {
			context.pattern = pattern;
			context.flags = flags ?? '';
			context.input = input;
			context.result = undefined;
			return run<boolean>(scripts.test);
		},
		replace(pattern, input, flags, replacement) {
			context.pattern = pattern;
			context.flags = flags ?? '';
			context.input = input;
			context.replacement = replacement;
			context.result = undefined;
			return run<string>(scripts.replace);
		},
		matchAll(pattern, input, flags) {
			context.pattern = pattern;
			context.flags = globalFlag(flags);
			context.input = input;
			context.result = undefined;
			return run<RegExpMatchArray[]>(scripts.matchAll);
		},
		split(pattern, input, flags) {
			context.pattern = pattern;
			context.flags = flags ?? '';
			context.input = input;
			context.result = undefined;
			return run<string[]>(scripts.split);
		},
	};
}

function createDefaultEngine(): RegexEngine {
	const vm = loadNodeVm();
	return vm ? nodeVmEngine(vm) : nativeEngine();
}

export function setSafeRegexEngine(regexEngine: RegexEngine): void {
	engine = regexEngine;
}

export function resetSafeRegexEngine(): void {
	engine = createDefaultEngine();
}

engine = createDefaultEngine();

export const safeRegex: RegexEngine = {
	exec: (pattern, input, flags) => engine.exec(pattern, input, flags),
	test: (pattern, input, flags) => engine.test(pattern, input, flags),
	replace: (pattern, input, flags, replacement) =>
		engine.replace(pattern, input, flags, replacement),
	matchAll: (pattern, input, flags) => engine.matchAll(pattern, input, flags),
	split: (pattern, input, flags) => engine.split(pattern, input, flags),
};
