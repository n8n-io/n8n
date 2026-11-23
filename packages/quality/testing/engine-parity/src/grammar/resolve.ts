import { renderExpression, renderValue } from './expressions';
import type { ExprScope, ValueExpr } from './expressions';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValueExpr(value: unknown): value is ValueExpr {
	return isRecord(value) && typeof value.kind === 'string';
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
