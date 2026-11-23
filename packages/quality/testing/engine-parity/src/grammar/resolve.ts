import { isRecord } from '@n8n/utils/is-record';

import type { CodeSpec } from './catalog';
import { renderExpression, renderValue } from './expressions';
import type { ExprScope, ValueExpr } from './expressions';

function isValueExpr(value: unknown): value is ValueExpr {
	return isRecord(value) && typeof value.kind === 'string';
}

function isCodeSpec(value: unknown): value is CodeSpec {
	return (
		isRecord(value) &&
		(value.mode === 'runOnceForAllItems' || value.mode === 'runOnceForEachItem') &&
		typeof value.field === 'string' &&
		isValueExpr(value.value)
	);
}

export interface ResolveContext {
	scope: ExprScope;
}

/** Fills the holes of a parameter draft. See `ParamDraft` in `catalog/types.ts`. */
export function resolveDraft(value: unknown, ctx: ResolveContext): unknown {
	if (Array.isArray(value)) return value.map((entry) => resolveDraft(entry, ctx));
	if (!isRecord(value)) return value;

	if ('$expr' in value && isValueExpr(value.$expr)) {
		return renderExpression(value.$expr, ctx.scope);
	}
	if ('$jsonTemplate' in value && isRecord(value.$jsonTemplate)) {
		return renderJsonTemplate(value.$jsonTemplate, ctx.scope);
	}
	if ('$outputIndex' in value && isRecord(value.$outputIndex)) {
		const { value: expr, numberOutputs } = value.$outputIndex;
		if (isValueExpr(expr) && typeof numberOutputs === 'number') {
			return `={{ (Math.abs(Math.trunc(Number(${renderValue(expr, ctx.scope)}))) || 0) % ${numberOutputs} }}`;
		}
	}
	if ('$code' in value && isCodeSpec(value.$code)) {
		return renderCode(value.$code, ctx.scope);
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, resolveDraft(entry, ctx)]),
	);
}

/** The JSON output of a Set node in raw mode. Expressions make it a template. */
function renderJsonTemplate(fields: Record<string, unknown>, scope: ExprScope): string {
	let hasExpression = false;
	const parts = Object.entries(fields).map(([key, field]) => {
		if (isRecord(field) && isValueExpr(field.$expr)) {
			hasExpression = true;
			return `${JSON.stringify(key)}: {{ JSON.stringify(${renderValue(field.$expr, scope)} ?? null) }}`;
		}
		return `${JSON.stringify(key)}: ${JSON.stringify(field)}`;
	});
	const body = `{ ${parts.join(', ')} }`;
	return hasExpression ? `=${body}` : body;
}

function renderCode(spec: CodeSpec, scope: ExprScope): string {
	const field = JSON.stringify(spec.field);
	if (spec.mode === 'runOnceForEachItem') {
		const value = renderValue(spec.value, scope);
		const base = spec.spread ? '...$json, ' : '';
		return [`const value = ${value};`, `return { json: { ${base}[${field}]: value } };`].join('\n');
	}
	const value = renderValue(spec.value, { ...scope, json: 'item.json' });
	const base = spec.spread ? '...item.json, ' : '';
	return [
		'return $input.all().map((item) => {',
		`\tconst value = ${value};`,
		`\treturn { json: { ${base}[${field}]: value } };`,
		'});',
	].join('\n');
}
