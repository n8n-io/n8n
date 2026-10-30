import isEqualWith from 'lodash/isEqualWith';

import { getCompiled } from './compiler';
import { readsClockOrParameter, skeletonOf } from './skeleton';
import type { ExpressionEvaluationOutcome } from '../../expression';
import type { IWorkflowDataProxyData } from '../../interfaces';
import * as LoggerProxy from '../../logger-proxy';
import { isObject } from '../../utils';

// Each mismatch shape is reported once per process, up to this many, so a
// common mismatch cannot spend the Sentry quota.
const MAX_REPORTED_SHAPES = 1000;

// The comparison runs outside the engine timeout.
const MAX_COMPARED_PAIRS = 10_000;

class ComparisonTooLargeError extends Error {}

/**
 * Whether verify mode can compare the expression: it fits the native subset
 * and reads neither `$now`, `$today` nor `$parameter`.
 */
export function canVerifyNatively(expression: string): boolean {
	const compiled = getCompiled(expression);
	return (
		compiled !== null &&
		!compiled.chunks.some((chunk) => chunk.type === 'code' && readsClockOrParameter(chunk.node))
	);
}

/** The shape of an expression with its user data masked. Null outside the native subset. */
export function nativeSkeleton(expression: string): string | null {
	const compiled = getCompiled(expression);
	if (compiled === null) return null;

	return compiled.chunks
		.map((chunk) =>
			chunk.type === 'text'
				? chunk.text === ''
					? ''
					: '<text>'
				: `{{ ${skeletonOf(chunk.node)} }}`,
		)
		.join('');
}

/** Holds no workflow data. */
export type NativeVerifyMismatch = {
	engine: 'legacy' | 'vm' | 'quickjs';
	skeleton: string;
	nativeResultType: string;
	engineResultType: string;
	workflowId?: string;
};

/** Compares a sample of native results with the engine's and reports each new difference. */
export class NativeVerifier {
	private readonly reportedShapes = new Set<string>();

	constructor(
		private readonly sample: number,
		private readonly report: (mismatch: NativeVerifyMismatch) => void,
		private readonly canReport: () => boolean = () => true,
	) {}

	/** Draws whether this evaluation is part of the sample. False while reports cannot be sent. */
	isSampled(): boolean {
		return this.sample > 0 && this.canReport() && Math.random() < this.sample;
	}

	/** Reports `native` when it differs from `engine`. Never throws. */
	compare(
		expression: string,
		engineName: NativeVerifyMismatch['engine'],
		native: ExpressionEvaluationOutcome,
		engine: ExpressionEvaluationOutcome,
		data: IWorkflowDataProxyData,
	): void {
		try {
			if (compareResults(native, engine) === 'different' && !hitEngineLimit(engine)) {
				const skeleton = nativeSkeleton(expression);
				if (skeleton === null) return;

				const shape = {
					skeleton,
					engine: engineName,
					nativeResultType: resultType(native),
					engineResultType: resultType(engine),
				};
				const key = JSON.stringify(shape);
				if (this.reportedShapes.has(key)) return;
				if (this.reportedShapes.size >= MAX_REPORTED_SHAPES) return;
				this.reportedShapes.add(key);
				if (this.reportedShapes.size === MAX_REPORTED_SHAPES) {
					LoggerProxy.warn(
						'Native evaluation verify mode reached its report limit and stops reporting new differences',
					);
				}

				this.report({ ...shape, workflowId: workflowIdOf(data) });
			}
		} catch {
			// Reporting must never change what the caller gets.
		}
	}
}

type Comparison = 'same' | 'different' | 'too_large';

function compareResults(
	a: ExpressionEvaluationOutcome,
	b: ExpressionEvaluationOutcome,
): Comparison {
	if (a.ok && b.ok) return compareValues(a.value, b.value);
	if (a.ok || b.ok) return 'different';
	const sameError =
		a.error instanceof Error &&
		b.error instanceof Error &&
		a.error.constructor === b.error.constructor &&
		a.error.message === b.error.message;
	return sameError ? 'same' : 'different';
}

// TODO(native-evaluation verify, CET-447): share the bounded comparison with the QuickJS shadow.
function compareValues(a: unknown, b: unknown, maxComparedPairs = MAX_COMPARED_PAIRS): Comparison {
	let remaining = maxComparedPairs;
	const compare = (x: unknown, y: unknown): boolean | undefined => {
		remaining--;
		if (remaining < 0) {
			throw new ComparisonTooLargeError();
		}
		// QuickJS drops object keys that hold undefined from its results.
		if (isObject(x) && isObject(y)) {
			return sameDefinedEntries(x, y, compare);
		}
		return undefined;
	};
	try {
		return isEqualWith(a, b, compare) ? 'same' : 'different';
	} catch (error) {
		if (error instanceof ComparisonTooLargeError) {
			return 'too_large';
		}
		throw error;
	}
}

function sameDefinedEntries(
	a: Record<string, unknown>,
	b: Record<string, unknown>,
	compare: (x: unknown, y: unknown) => boolean | undefined,
): boolean {
	const definedKeys = (value: Record<string, unknown>) =>
		Object.keys(value).filter((key) => value[key] !== undefined);
	const aKeys = definedKeys(a);
	return (
		aKeys.length === definedKeys(b).length &&
		aKeys.every((key) => Object.hasOwn(b, key) && isEqualWith(a[key], b[key], compare))
	);
}

function hitEngineLimit(result: ExpressionEvaluationOutcome): boolean {
	return !result.ok && (result.errorClass === 'timeout' || result.errorClass === 'memory_limit');
}

function resultType(result: ExpressionEvaluationOutcome): string {
	if (!result.ok) {
		return `error:${result.errorClass}`;
	}
	const { value } = result;
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object') return prototypeName(value);
	return typeof value;
}

function prototypeName(value: object): string {
	const prototype: unknown = Object.getPrototypeOf(value);
	const constructor: unknown =
		typeof prototype === 'object' && prototype !== null ? prototype.constructor : undefined;
	return typeof constructor === 'function' ? constructor.name : 'object';
}

function workflowIdOf(data: IWorkflowDataProxyData): string | undefined {
	try {
		const id: unknown = data.$workflow?.id;
		return typeof id === 'string' ? id : undefined;
	} catch {
		return undefined;
	}
}
