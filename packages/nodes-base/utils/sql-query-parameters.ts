import { DateTime } from 'luxon';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { isExpression, NodeOperationError } from 'n8n-workflow';

import { getResolvables } from './utilities';

// getNodeParameter() applies this same conversion to its result;
// evaluateExpression() doesn't, so a segment evaluated on its own needs it too.
function toBoundValue(value: unknown): unknown {
	return DateTime.isDateTime(value) ? value.toString() : value;
}

// A match inside a quoted string/identifier is text, not a placeholder or
// identifier reference. Counting ' and " independently can't tell: a stray
// " inside a '...' string throws off the double-quote count and can mask a
// real placeholder after it — so this tracks the one quote (if any) that's
// currently open. '' and "" are the standard escaped-quote forms inside
// their own string. This does not recognize SQL comments (-- or /* */); a
// $N inside a comment is still treated as a placeholder reference.
export function isInsideQuotes(text: string, index: number): boolean {
	let quoteChar: string | null = null;

	for (let i = 0; i < index; i++) {
		const ch = text[i];
		if (quoteChar === null) {
			if (ch === "'" || ch === '"') quoteChar = ch;
		} else if (ch === quoteChar) {
			if (text[i + 1] === quoteChar) i++;
			else quoteChar = null;
		}
	}

	return quoteChar !== null;
}

function findResolvableSpans(text: string): Array<[number, number]> {
	const spans: Array<[number, number]> = [];
	let searchFrom = 0;
	for (const resolvable of getResolvables(text)) {
		const start = text.indexOf(resolvable, searchFrom);
		if (start === -1) continue;
		spans.push([start, start + resolvable.length]);
		searchFrom = start + resolvable.length;
	}
	return spans;
}

// Only commas outside a {{ }} span are delimiters. An empty segment (e.g. the
// leading one in ",foo") is a real positional value, not a gap to drop — only
// a field that is empty outright yields no values at all.
export function splitRawSqlQueryParameters(rawText: string): string[] {
	const text = rawText.replace(/^=+/, '');
	if (text === '') return [];

	const resolvableSpans = findResolvableSpans(text);
	const isInsideResolvable = (index: number) =>
		resolvableSpans.some(([start, end]) => index >= start && index < end);

	const segments: string[] = [];
	let segmentStart = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === ',' && !isInsideResolvable(i)) {
			segments.push(text.slice(segmentStart, i));
			segmentStart = i + 1;
		}
	}
	segments.push(text.slice(segmentStart));

	return segments.map((segment) => segment.trim());
}

// One bound value per segment. A segment that is exactly one expression keeps
// that expression's own type (e.g. a number) when it's the field's only
// segment; anything else — literal text, more than one expression, or a
// collection/array value in a multi-segment field — is rendered to a single
// string, the same way the query text itself is interpolated.
export function evaluateSqlQueryParameterSegments(
	this: IExecuteFunctions,
	segments: string[],
	itemIndex: number,
): unknown[] {
	const renderAsText = (resolvable: string): string => {
		const value = this.evaluateExpression(resolvable, itemIndex);
		if (value === undefined || value === null) return '';
		return typeof value === 'string' ? value : String(toBoundValue(value));
	};

	return segments.map((segment, segmentIndex) => {
		const resolvables = getResolvables(segment);
		if (resolvables.length === 0) return segment;

		if (resolvables.length === 1 && resolvables[0] === segment) {
			const value = toBoundValue(this.evaluateExpression(resolvables[0], itemIndex));
			// A Date is a plain bind value every driver here accepts natively, not
			// a collection — only an array or a plain object needs rejecting below.
			if (
				segments.length === 1 ||
				value === null ||
				value instanceof Date ||
				typeof value !== 'object'
			) {
				// Some drivers (e.g. Snowflake's SDK) only special-case an explicit
				// null, not undefined, so normalize here rather than per driver.
				return value ?? null;
			}

			throw new NodeOperationError(
				this.getNode(),
				'Query Parameters cannot resolve a value with multiple fields (like an array or an object) for one of several comma-separated values. Use a single value for this parameter, or move it to its own expression.',
				{ itemIndex, description: `Parameter ${segmentIndex + 1}` },
			);
		}

		let rendered = segment;
		for (const resolvable of resolvables) {
			rendered = rendered.replace(resolvable, () => renderAsText(resolvable));
		}
		return rendered;
	});
}

// One value per comma-separated segment of the field's text. A fixed-mode
// field (not isExpression) is only ever split on commas and bound as literal
// text; expressions are evaluated solely for a field in expression mode.
export function resolveQueryReplacementSegments(
	this: IExecuteFunctions,
	itemIndex: number,
	literalText: string,
	fieldName = 'queryReplacement',
): unknown[] {
	const options = this.getNode().parameters.options as IDataObject | undefined;
	const rawText = options?.[fieldName];

	if (!isExpression(rawText)) return literalText.split(',').map((entry) => entry.trim());

	const segments = splitRawSqlQueryParameters(rawText);
	return evaluateSqlQueryParameterSegments.call(this, segments, itemIndex);
}

export function resolveSqlQueryParameters(this: IExecuteFunctions, itemIndex: number): unknown[] {
	const evaluated = this.getNodeParameter('options.queryReplacement', itemIndex, '');

	if (Array.isArray(evaluated)) return evaluated;
	if (evaluated === '') return [];
	// Bind null/undefined as NULL; don't treat them as unset.
	if (typeof evaluated !== 'string') return [toBoundValue(evaluated) ?? null];

	return resolveQueryReplacementSegments.call(this, itemIndex, evaluated);
}
