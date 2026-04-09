import { ApplicationError } from '@n8n/errors';
import type { IExpressionEvaluator } from '@n8n/expression-runtime';
import { MemoryLimitError, SecurityViolationError, TimeoutError } from '@n8n/expression-runtime';
import { DateTime, Duration, Interval } from 'luxon';

import { UnexpectedError } from './errors';
import { ExpressionExtensionError } from './errors/expression-extension.error';
import { ExpressionError } from './errors/expression.error';
import { evaluateExpression, setErrorHandler } from './expression-evaluator-proxy';
import {
	DollarSignValidator,
	PrototypeSanitizer,
	ThisSanitizer,
	sanitizer,
	sanitizerName,
} from './expression-sandboxing';
import { isExpression } from './expressions/expression-helpers';
import * as LoggerProxy from './logger-proxy';
import { extend, extendOptional } from './extensions';
import { extendSyntax } from './extensions/expression-extension';
import { extendedFunctions } from './extensions/extended-functions';
import type {
	IDataObject,
	INodeParameters,
	IWorkflowDataProxyData,
	NodeParameterValue,
} from './interfaces';
const IS_FRONTEND_IN_DEV_MODE =
	typeof process === 'object' &&
	Object.keys(process).length === 1 &&
	'env' in process &&
	Object.keys(process.env).length === 0;

const IS_FRONTEND = typeof process === 'undefined' || IS_FRONTEND_IN_DEV_MODE;

const isSyntaxError = (error: unknown): error is SyntaxError =>
	error instanceof SyntaxError || (error instanceof Error && error.name === 'SyntaxError');

const isExpressionError = (error: unknown): error is ExpressionError =>
	error instanceof ExpressionError || error instanceof ExpressionExtensionError;

const isTypeError = (error: unknown): error is TypeError =>
	error instanceof TypeError || (error instanceof Error && error.name === 'TypeError');

// Make sure that error get forwarded
setErrorHandler((error: Error) => {
	if (isExpressionError(error)) throw error;
});

/**
 * Map errors from the VM expression evaluator to host-side error types.
 *
 * The VM bridge can only reconstruct plain Error objects with .name set,
 * because it can't import ExpressionError/ExpressionExtensionError from
 * packages/workflow without creating a circular dependency.
 *
 * TODO: Move this reconstruction into the bridge once expression-runtime
 * can depend on workflow error classes (or a shared error package exists).
 */
function mapVmError(error: unknown): Error {
	if (isExpressionError(error)) return error;

	// Runtime error types (TimeoutError, MemoryLimitError, etc.) must be
	// checked before the name-based reconstruction below, because they
	// extend the runtime's ExpressionError and share .name === 'ExpressionError'.
	if (error instanceof TimeoutError) {
		const wrapped = new ExpressionError('Expression timed out');
		wrapped.cause = error;
		return wrapped;
	}
	if (error instanceof MemoryLimitError) {
		const wrapped = new ExpressionError('Expression exceeded memory limit');
		wrapped.cause = error;
		return wrapped;
	}
	if (error instanceof SecurityViolationError) {
		const wrapped = new ExpressionError(error.message);
		wrapped.cause = error;
		return wrapped;
	}

	// Name-based reconstruction for errors that crossed the isolate boundary
	if (error instanceof Error && error.name === 'ExpressionExtensionError') {
		const reconstructed = new ExpressionExtensionError(error.message);
		Object.assign(reconstructed, error);
		return reconstructed;
	}
	if (error instanceof Error && error.name === 'ExpressionError') {
		const reconstructed = new ExpressionError(error.message);
		Object.assign(reconstructed, error);
		return reconstructed;
	}

	if (isSyntaxError(error)) return new ExpressionError('invalid syntax');

	if (error instanceof Error) return error;
	return new Error(String(error));
}

/**
 * Creates a safe Object wrapper that removes dangerous static methods
 * that could be used to bypass property access sanitization.
 *
 * Blocked methods:
 * - defineProperty/defineProperties: Can set properties bypassing access checks
 * - setPrototypeOf/getPrototypeOf: Can manipulate prototype chains
 * - getOwnPropertyDescriptor(s): Can introspect sensitive properties
 * - __defineGetter__/__defineSetter__: Legacy methods that can bypass set traps
 * - __lookupGetter__/__lookupSetter__: Can introspect getters/setters
 *
 * Object.create is wrapped to prevent passing property descriptors (2nd argument)
 */
const createSafeObject = (): typeof Object => {
	const safeCreate = (proto: object | null): object => {
		// Only allow single-argument create (no property descriptors)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Object.create(proto);
	};

	// Block dangerous static and prototype methods
	const blockedMethods = new Set([
		// Static methods that can bypass property access checks
		'defineProperty',
		'defineProperties',
		'setPrototypeOf',
		'getPrototypeOf',
		'getOwnPropertyDescriptor',
		'getOwnPropertyDescriptors',
		// Legacy methods that can bypass Proxy set traps
		'__defineGetter__',
		'__defineSetter__',
		'__lookupGetter__',
		'__lookupSetter__',
	]);

	// Create a proxy that blocks dangerous methods
	return new Proxy(Object, {
		get(target, prop, receiver) {
			if (blockedMethods.has(prop as string)) {
				return undefined;
			}

			// Wrap Object.create to prevent property descriptor argument
			if (prop === 'create') {
				return safeCreate;
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return Reflect.get(target, prop, receiver);
		},
		// Block defineProperty trap to prevent __defineGetter__ from working
		defineProperty() {
			return false;
		},
	});
};

/**
 * List of properties that are blocked on Error and all Error subclasses.
 * These properties can be exploited for sandbox escape via V8's stack trace API.
 */
const blockedErrorProperties = new Set([
	// V8 stack trace manipulation
	'captureStackTrace',
	'prepareStackTrace',
	'stackTraceLimit',
	// Legacy methods that can bypass Proxy set traps
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
]);

/**
 * Creates a safe Error constructor that removes dangerous static methods
 * like captureStackTrace and prepareStackTrace which can be exploited for RCE.
 *
 * The V8 prepareStackTrace attack works by:
 * 1. Setting Error.prepareStackTrace to a malicious function
 * 2. Creating a new Error and accessing its .stack property
 * 3. V8 calls the prepareStackTrace function with CallSite objects
 * 4. CallSite.getThis() returns the real global object, escaping the sandbox
 */
const createSafeError = (): typeof Error => {
	return new Proxy(Error, {
		get(target, prop, receiver) {
			if (blockedErrorProperties.has(prop as string)) {
				return undefined;
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return Reflect.get(target, prop, receiver);
		},
		set() {
			// Prevent setting any properties on Error (like prepareStackTrace)
			return false;
		},
		defineProperty() {
			// Prevent defineProperty (blocks __defineGetter__ internally)
			return false;
		},
	});
};

/**
 * Creates a safe wrapper for Error subclasses (TypeError, SyntaxError, etc.)
 * While prepareStackTrace is only on Error in V8, we wrap subclasses for defense in depth.
 */
const createSafeErrorSubclass = <T extends ErrorConstructor>(ErrorClass: T): T => {
	return new Proxy(ErrorClass, {
		get(target, prop, receiver) {
			if (blockedErrorProperties.has(prop as string)) {
				return undefined;
			}

			return Reflect.get(target, prop, receiver);
		},
		set() {
			return false;
		},
		defineProperty() {
			return false;
		},
	});
};

export class Expression {
	private static expressionEngine: 'legacy' | 'vm' = 'legacy';

	private static vmEvaluator?: IExpressionEvaluator;

	constructor(private readonly timezone: string) {}

	/**
	 * Check if VM evaluator should be used for evaluation.
	 * @private
	 */
	private static shouldUseVm(): boolean {
		return this.expressionEngine === 'vm' && !IS_FRONTEND && !!this.vmEvaluator;
	}

	/**
	 * Initialize the VM evaluator (if feature flag is enabled).
	 * Should be called once during application startup.
	 * Only available in Node.js environments (not in browser).
	 */
	static async initExpressionEngine(options: {
		engine: 'legacy' | 'vm';
		bridgeTimeout: number;
		bridgeMemoryLimit: number;
		poolSize: number;
		maxCodeCacheSize: number;
	}): Promise<void> {
		if (options.engine !== 'vm' || IS_FRONTEND) return;
		this.expressionEngine = options.engine;

		if (!this.vmEvaluator) {
			// Dynamic import to avoid loading expression-runtime in browser environments
			const { ExpressionEvaluator, IsolatedVmBridge } = await import('@n8n/expression-runtime');
			this.vmEvaluator = new ExpressionEvaluator({
				createBridge: () =>
					new IsolatedVmBridge({
						timeout: options.bridgeTimeout,
						memoryLimit: options.bridgeMemoryLimit,
						logger: LoggerProxy,
					}),
				maxCodeCacheSize: options.maxCodeCacheSize,
				poolSize: options.poolSize,
				hooks: {
					before: [ThisSanitizer],
					after: [PrototypeSanitizer, DollarSignValidator],
				},
				logger: LoggerProxy,
			});
			await this.vmEvaluator.initialize();
		}
	}

	async acquireIsolate(): Promise<void> {
		if (Expression.vmEvaluator) await Expression.vmEvaluator.acquire(this);
	}

	async releaseIsolate(): Promise<void> {
		if (Expression.vmEvaluator) await Expression.vmEvaluator.release(this);
	}

	/**
	 * Dispose the VM evaluator and release resources.
	 * Should be called during application shutdown or test teardown.
	 */
	static async disposeExpressionEngine(): Promise<void> {
		if (this.vmEvaluator) {
			await this.vmEvaluator.dispose();
			this.vmEvaluator = undefined;
		}
	}

	/**
	 * Get the active expression evaluation implementation.
	 * Used for testing and verification.
	 */
	static getActiveImplementation(): 'legacy' | 'vm' {
		if (this.shouldUseVm()) return 'vm';
		return 'legacy';
	}

	/**
	 * Set the expression engine programmatically.
	 *
	 * WARNING: This is a global setting — switching engines mid-execution could
	 * cause a workflow to evaluate some expressions with one engine and some with
	 * another. Only use this in benchmarks and tests, never in production code.
	 * In production, set `N8N_EXPRESSION_ENGINE` before process startup instead.
	 */
	static setExpressionEngine(engine: 'legacy' | 'vm'): void {
		this.expressionEngine = engine;
	}

	static initializeGlobalContext(data: IDataObject) {
		/**
		 * Denylist
		 */

		data.document = {};
		data.global = {};
		data.window = {};
		data.Window = {};
		data.this = {};
		data.globalThis = {};
		data.self = {};

		// Alerts
		data.alert = {};
		data.prompt = {};
		data.confirm = {};

		// Prevent Remote Code Execution
		data.eval = {};
		data.uneval = {};
		data.setTimeout = {};
		data.setInterval = {};
		data.setImmediate = {};
		data.clearImmediate = {};
		data.queueMicrotask = {};
		data.Function = {};

		// Prevent Node.js module access
		data.require = {};
		data.module = {};
		data.Buffer = {};
		data.__dirname = {};
		data.__filename = {};

		// Prevent requests
		data.fetch = {};
		data.XMLHttpRequest = {};

		// Prevent control abstraction
		data.Promise = {};
		data.Generator = {};
		data.GeneratorFunction = {};
		data.AsyncFunction = {};
		data.AsyncGenerator = {};
		data.AsyncGeneratorFunction = {};

		// Prevent WASM
		data.WebAssembly = {};

		// Prevent Reflection
		data.Reflect = {};
		data.Proxy = {};

		data.__lookupGetter__ = undefined;
		data.__lookupSetter__ = undefined;
		data.__defineGetter__ = undefined;
		data.__defineSetter__ = undefined;

		// Deprecated
		data.escape = {};
		data.unescape = {};

		/**
		 * Allowlist
		 */

		// Dates
		data.Date = Date;
		data.DateTime = DateTime;
		data.Interval = Interval;
		data.Duration = Duration;

		// Objects - use safe wrapper to block dangerous methods like defineProperty
		data.Object = createSafeObject();

		// Arrays
		data.Array = Array;
		data.Int8Array = Int8Array;
		data.Uint8Array = Uint8Array;
		data.Uint8ClampedArray = Uint8ClampedArray;
		data.Int16Array = Int16Array;
		data.Uint16Array = Uint16Array;
		data.Int32Array = Int32Array;
		data.Uint32Array = Uint32Array;
		data.Float32Array = Float32Array;
		data.Float64Array = Float64Array;
		data.BigInt64Array = typeof BigInt64Array !== 'undefined' ? BigInt64Array : {};
		data.BigUint64Array = typeof BigUint64Array !== 'undefined' ? BigUint64Array : {};

		// Collections
		data.Map = typeof Map !== 'undefined' ? Map : {};
		data.WeakMap = typeof WeakMap !== 'undefined' ? WeakMap : {};
		data.Set = typeof Set !== 'undefined' ? Set : {};
		data.WeakSet = typeof WeakSet !== 'undefined' ? WeakSet : {};

		// Errors - use safe wrappers to block prepareStackTrace, captureStackTrace,
		// and other dangerous properties that could enable sandbox escape
		data.Error = createSafeError();
		data.TypeError = createSafeErrorSubclass(TypeError);
		data.SyntaxError = createSafeErrorSubclass(SyntaxError);
		data.EvalError = createSafeErrorSubclass(EvalError);
		data.RangeError = createSafeErrorSubclass(RangeError);
		data.ReferenceError = createSafeErrorSubclass(ReferenceError);
		data.URIError = createSafeErrorSubclass(URIError);

		// Internationalization
		data.Intl = typeof Intl !== 'undefined' ? Intl : {};

		// Text
		// eslint-disable-next-line id-denylist
		data.String = String;
		data.RegExp = RegExp;

		// Math
		data.Math = Math;
		// eslint-disable-next-line id-denylist
		data.Number = Number;
		data.BigInt = typeof BigInt !== 'undefined' ? BigInt : {};
		data.Infinity = Infinity;
		data.NaN = NaN;
		data.isFinite = Number.isFinite;
		data.isNaN = Number.isNaN;
		data.parseFloat = parseFloat;
		data.parseInt = parseInt;

		// Structured data
		data.JSON = JSON;
		data.ArrayBuffer = typeof ArrayBuffer !== 'undefined' ? ArrayBuffer : {};
		data.SharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : {};
		data.Atomics = typeof Atomics !== 'undefined' ? Atomics : {};
		data.DataView = typeof DataView !== 'undefined' ? DataView : {};

		data.encodeURI = encodeURI;
		data.encodeURIComponent = encodeURIComponent;
		data.decodeURI = decodeURI;
		data.decodeURIComponent = decodeURIComponent;

		// Other
		// eslint-disable-next-line id-denylist
		data.Boolean = Boolean;
		data.Symbol = Symbol;
	}

	static resolveWithoutWorkflow(expression: string, data: IDataObject = {}) {
		return evaluateExpression(expression, data);
	}

	/**
	 * Converts an object to a string in a way to make it clear that
	 * the value comes from an object
	 *
	 */
	convertObjectValueToString(value: object): string {
		if (value instanceof DateTime && value.invalidReason !== null) {
			throw new ApplicationError('invalid DateTime');
		}

		if (value === null) {
			return 'null';
		}

		let typeName = value.constructor.name ?? 'Object';
		if (DateTime.isDateTime(value)) {
			typeName = 'DateTime';
		}

		let result = '';
		if (value instanceof Date) {
			// We don't want to use JSON.stringify for dates since it disregards workflow timezone
			result = DateTime.fromJSDate(value, {
				zone: this.timezone,
			}).toISO();
		} else if (DateTime.isDateTime(value)) {
			result = value.toString();
		} else {
			result = JSON.stringify(value);
		}

		result = result
			.replace(/,"/g, ', "') // spacing for
			.replace(/":/g, '": '); // readability

		return `[${typeName}: ${result}]`;
	}

	/**
	 * Resolves the parameter value.  If it is an expression it will execute it and
	 * return the result. For everything simply the supplied value will be returned.
	 *
	 * @param {NodeParameterValue} parameterValue - The parameter value to resolve
	 * @param {IWorkflowDataProxyData} data - The workflow data proxy data
	 * @param {boolean} [returnObjectAsString=false] - Whether to convert objects to strings
	 */
	resolveSimpleParameterValue(
		parameterValue: NodeParameterValue,
		data: IWorkflowDataProxyData,
		returnObjectAsString = false,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
		// Check if it is an expression
		if (!isExpression(parameterValue)) {
			// Is no expression so return value
			return parameterValue;
		}

		// Is an expression

		// Remove the equal sign
		parameterValue = parameterValue.substr(1);

		// Support only a subset of process properties
		data.process =
			typeof process !== 'undefined'
				? {
						arch: process.arch,
						env: process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE !== 'false' ? {} : process.env,
						platform: process.platform,
						pid: process.pid,
						ppid: process.ppid,
						release: process.release,
						version: process.version,
						versions: process.versions,
					}
				: {};

		Expression.initializeGlobalContext(data);

		// expression extensions
		data.extend = extend;
		data.extendOptional = extendOptional;

		Object.defineProperty(data, sanitizerName, {
			value: sanitizer,
			writable: false,
			configurable: false,
		});

		Object.assign(data, extendedFunctions);

		const constructorValidation = new RegExp(/\.\s*constructor/gm);
		if (parameterValue.match(constructorValidation)) {
			throw new ExpressionError('Expression contains invalid constructor function call', {
				causeDetailed: 'Constructor override attempt is not allowed due to security concerns',
				runIndex: data.$thisRunIndex,
				itemIndex: data.$thisItemIndex,
			});
		}

		// Execute the expression
		const extendedExpression = extendSyntax(parameterValue);
		const returnValue = this.renderExpression(extendedExpression, data);
		if (typeof returnValue === 'function') {
			if (returnValue.name === 'DateTime')
				throw new ApplicationError('this is a DateTime, please access its methods');

			throw new ApplicationError('this is a function, please add ()');
		} else if (typeof returnValue === 'string') {
			return returnValue;
		} else if (returnValue !== null && typeof returnValue === 'object') {
			if (returnObjectAsString) {
				return this.convertObjectValueToString(returnValue);
			}
		}

		return returnValue;
	}

	private renderExpression(expression: string, data: IWorkflowDataProxyData) {
		// Use VM evaluator if engine is set to 'vm' and we're not in the browser
		if (Expression.expressionEngine === 'vm' && !IS_FRONTEND) {
			if (!Expression.vmEvaluator) {
				throw new UnexpectedError(
					'N8N_EXPRESSION_ENGINE=vm is enabled but VM evaluator is not initialized. Call Expression.initExpressionEngine() during application startup.',
				);
			}

			try {
				const result = Expression.vmEvaluator.evaluate(expression, data, this, {
					timezone: this.timezone,
				});
				return result as string | null | (() => unknown);
			} catch (error) {
				throw mapVmError(error);
			}
		}

		// Fall back to current implementation
		try {
			return evaluateExpression(expression, data);
		} catch (error) {
			if (isExpressionError(error)) throw error;

			if (isSyntaxError(error)) throw new ApplicationError('invalid syntax');

			if (isTypeError(error) && IS_FRONTEND && error.message.endsWith('is not a function')) {
				const match = error.message.match(/(?<msg>[^.]+is not a function)/);

				if (!match?.groups?.msg) return null;

				throw new ApplicationError(match.groups.msg);
			}
		}

		return null;
	}

	/**
	 * Returns the resolved node parameter value. If it is an expression it will execute it and
	 * return the result. If the value to resolve is an array or object it will do the same
	 * for all of the items and values.
	 *
	 * @param {NodeParameterValueType | INodeParameterResourceLocator} parameterValue - The parameter value to resolve
	 * @param {IWorkflowDataProxyData} data - The workflow data proxy data
	 * @param {boolean} [returnObjectAsString=false] - Whether to convert objects to strings
	 */
}
