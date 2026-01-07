import { DateTime, Duration, Interval } from 'luxon';

import { ApplicationError } from '@n8n/errors';
import { ExpressionExtensionError } from './errors/expression-extension.error';
import { ExpressionError } from './errors/expression.error';
import { evaluateExpression, setErrorHandler } from './expression-evaluator-proxy';
import { sanitizer, sanitizerName } from './expression-sandboxing';
import { isExpression } from './expressions/expression-helpers';
import { extend, extendOptional } from './extensions';
import { extendSyntax } from './extensions/expression-extension';
import { extendedFunctions } from './extensions/extended-functions';
import { getGlobalState } from './global-state';
import { createEmptyRunExecutionData } from './run-execution-data-factory';
import type {
	IDataObject,
	IExecuteData,
	INode,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeParameters,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowDataProxyData,
	NodeParameterValue,
	NodeParameterValueType,
	WorkflowExecuteMode,
} from './interfaces';
import type { Workflow } from './workflow';
import { WorkflowDataProxy } from './workflow-data-proxy';
import type { IRunExecutionData } from './run-execution-data/run-execution-data';

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
	constructor(private readonly workflow: Workflow) {}

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
		data.Function = {};

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
				zone: this.workflow.settings?.timezone ?? getGlobalState().defaultTimezone,
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
	 * @param {(IRunExecutionData | null)} runExecutionData
	 * @param {boolean} [returnObjectAsString=false]
	 */
	// TODO: Clean that up at some point and move all the options into an options object
	// eslint-disable-next-line complexity
	resolveSimpleParameterValue(
		parameterValue: NodeParameterValue,
		siblingParameters: INodeParameters,
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		returnObjectAsString = false,
		selfData = {},
		contextNodeName?: string,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] {
		// Check if it is an expression
		if (!isExpression(parameterValue)) {
			// Is no expression so return value
			return parameterValue;
		}

		// Is an expression

		// Remove the equal sign

		parameterValue = parameterValue.substr(1);

		// Generate a data proxy which allows to query workflow data
		const dataProxy = new WorkflowDataProxy(
			this.workflow,
			runExecutionData,
			runIndex,
			itemIndex,
			activeNodeName,
			connectionInputData,
			siblingParameters,
			mode,
			additionalKeys,
			executeData,
			-1,
			selfData,
			contextNodeName,
		);
		const data = dataProxy.getDataProxy();

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
						version: process.pid,
						versions: process.versions,
					}
				: {};

		Expression.initializeGlobalContext(data);

		// expression extensions
		data.extend = extend;
		data.extendOptional = extendOptional;

		data[sanitizerName] = sanitizer;

		Object.assign(data, extendedFunctions);

		const constructorValidation = new RegExp(/\.\s*constructor/gm);
		if (parameterValue.match(constructorValidation)) {
			throw new ExpressionError('Expression contains invalid constructor function call', {
				causeDetailed: 'Constructor override attempt is not allowed due to security concerns',
				runIndex,
				itemIndex,
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
	 * Resolves value of parameter. But does not work for workflow-data.
	 *
	 * @param {(string | undefined)} parameterValue
	 */
	getSimpleParameterValue(
		node: INode,
		parameterValue: string | boolean | undefined,
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		defaultValue?: boolean | number | string | unknown[],
	): boolean | number | string | undefined | unknown[] {
		if (parameterValue === undefined) {
			// Value is not set so return the default
			return defaultValue;
		}

		// Get the value of the node (can be an expression)
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runData = createEmptyRunExecutionData();

		return this.getParameterValue(
			parameterValue,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			additionalKeys,
			executeData,
		) as boolean | number | string | undefined;
	}

	/**
	 * Resolves value of complex parameter. But does not work for workflow-data.
	 *
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[])} parameterValue
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | undefined)} [defaultValue]
	 */
	getComplexParameterValue(
		node: INode,
		parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		defaultValue: NodeParameterValueType | undefined = undefined,
		selfData = {},
	): NodeParameterValueType | undefined {
		if (parameterValue === undefined) {
			// Value is not set so return the default
			return defaultValue;
		}

		// Get the value of the node (can be an expression)
		const runIndex = 0;
		const itemIndex = 0;
		const connectionInputData: INodeExecutionData[] = [];
		const runData = createEmptyRunExecutionData();

		// Resolve the "outer" main values
		const returnData = this.getParameterValue(
			parameterValue,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			additionalKeys,
			executeData,
			false,
			selfData,
		);

		// Resolve the "inner" values
		return this.getParameterValue(
			returnData,
			runData,
			runIndex,
			itemIndex,
			node.name,
			connectionInputData,
			mode,
			additionalKeys,
			executeData,
			false,
			selfData,
		);
	}

	/**
	 * Returns the resolved node parameter value. If it is an expression it will execute it and
	 * return the result. If the value to resolve is an array or object it will do the same
	 * for all of the items and values.
	 *
	 * @param {(NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[])} parameterValue
	 * @param {(IRunExecutionData | null)} runExecutionData
	 * @param {boolean} [returnObjectAsString=false]
	 */
	// TODO: Clean that up at some point and move all the options into an options object
	getParameterValue(
		parameterValue: NodeParameterValueType | INodeParameterResourceLocator,
		runExecutionData: IRunExecutionData | null,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		mode: WorkflowExecuteMode,
		additionalKeys: IWorkflowDataProxyAdditionalKeys,
		executeData?: IExecuteData,
		returnObjectAsString = false,
		selfData = {},
		contextNodeName?: string,
	): NodeParameterValueType {
		// Helper function which returns true when the parameter is a complex one or array
		const isComplexParameter = (value: NodeParameterValueType) => {
			return typeof value === 'object';
		};

		// Helper function which resolves a parameter value depending on if it is simply or not
		const resolveParameterValue = (
			value: NodeParameterValueType,
			siblingParameters: INodeParameters,
		) => {
			if (isComplexParameter(value)) {
				return this.getParameterValue(
					value,
					runExecutionData,
					runIndex,
					itemIndex,
					activeNodeName,
					connectionInputData,
					mode,
					additionalKeys,
					executeData,
					returnObjectAsString,
					selfData,
					contextNodeName,
				);
			}

			return this.resolveSimpleParameterValue(
				value as NodeParameterValue,
				siblingParameters,
				runExecutionData,
				runIndex,
				itemIndex,
				activeNodeName,
				connectionInputData,
				mode,
				additionalKeys,
				executeData,
				returnObjectAsString,
				selfData,
				contextNodeName,
			);
		};

		// Check if it value is a simple one that we can get it resolved directly
		if (!isComplexParameter(parameterValue)) {
			return this.resolveSimpleParameterValue(
				parameterValue as NodeParameterValue,
				{},
				runExecutionData,
				runIndex,
				itemIndex,
				activeNodeName,
				connectionInputData,
				mode,
				additionalKeys,
				executeData,
				returnObjectAsString,
				selfData,
				contextNodeName,
			);
		}

		// The parameter value is complex so resolve depending on type
		if (Array.isArray(parameterValue)) {
			// Data is an array
			const returnData = parameterValue.map((item) =>
				resolveParameterValue(item as NodeParameterValueType, {}),
			);
			return returnData as NodeParameterValue[] | INodeParameters[];
		}

		if (parameterValue === null || parameterValue === undefined) {
			return parameterValue;
		}

		if (typeof parameterValue !== 'object') {
			return {};
		}

		// Data is an object
		const returnData: INodeParameters = {};

		for (const [key, value] of Object.entries(parameterValue)) {
			returnData[key] = resolveParameterValue(
				value as NodeParameterValueType,
				parameterValue as INodeParameters,
			);
		}

		if (returnObjectAsString && typeof returnData === 'object') {
			return this.convertObjectValueToString(returnData);
		}

		return returnData;
	}
}
