import isEqual from 'lodash/isEqual';

import { describeNatively } from '.';
import type { ExpressionEvaluationOutcome } from '../../expression';
import type { IWorkflowDataProxyData } from '../../interfaces';
import * as LoggerProxy from '../../logger-proxy';

// Each mismatch shape is reported once per process, up to this many, so a
// common mismatch cannot spend the Sentry quota.
const MAX_REPORTED_SHAPES = 1000;

export const DEFAULT_VERIFY_SAMPLE = 0.01;

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
	) {}

	/** Draws whether this evaluation is part of the sample. */
	isSampled(): boolean {
		return this.sample > 0 && Math.random() < this.sample;
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
			if (!sameResult(native, engine) && !hitEngineLimit(engine)) {
				const description = describeNatively(expression);
				if (description === null || description.readsClock) return;

				const shape = {
					skeleton: description.skeleton,
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

function sameResult(a: ExpressionEvaluationOutcome, b: ExpressionEvaluationOutcome): boolean {
	if (a.ok && b.ok) return isEqual(a.value, b.value);
	if (a.ok || b.ok) return false;
	return (
		a.error instanceof Error &&
		b.error instanceof Error &&
		a.error.constructor === b.error.constructor &&
		a.error.message === b.error.message
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
