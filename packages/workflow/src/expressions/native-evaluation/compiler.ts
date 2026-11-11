import { getParsedExpression } from '@n8n/tournament';
import type { ParsedCode } from '@n8n/tournament';
import { LruCache } from '@n8n/utils/lru-cache';

import type { SimpleNode } from './grammar';
import { parseSimple, usesPolyfilledChain } from './parser';

export type CompiledChunk = { type: 'text'; text: string } | { type: 'code'; node: SimpleNode };

export interface CompiledExpression {
	chunks: CompiledChunk[];
	// Exactly [empty text, code]: return the code chunk's raw value instead of
	// string-concatenating (tmpl compatibility, see ExpressionBuilder).
	isWholeValue: boolean;
}

// null = outside the subset. Declined expressions are cached too, so an
// expression the engine owns costs one parse here, not one per evaluation.
// Entries are keyed by expression text, so the key length is capped to keep
// the cache's memory bounded; longer expressions are compiled per evaluation.
const cache = new LruCache<string, CompiledExpression | null>(1024);
const MAX_CACHED_EXPRESSION_LENGTH = 10_000;

// One code chunk of the split expression, or null when it is outside the
// subset. A throw during the re-parse must always mean "declined", never
// escape.
function compileChunk(chunk: ParsedCode): SimpleNode | null {
	const body = chunk.parsed.program.body;
	if (body.length !== 1) return null;

	const statement = body[0];
	if (statement.type !== 'ExpressionStatement') return null;

	try {
		return parseSimple(statement.expression);
	} catch {
		return null;
	}
}

function compile(expression: string): CompiledExpression | null {
	let parsed;
	try {
		parsed = getParsedExpression(expression);
	} catch {
		// Syntax errors fall through to the engine for its error reporting.
		return null;
	}

	const chunks: CompiledChunk[] = [];
	const nodes: SimpleNode[] = [];
	for (const chunk of parsed) {
		if (chunk.type === 'text') {
			chunks.push(chunk);
			continue;
		}

		const node = compileChunk(chunk);
		if (node === null) return null;

		chunks.push({ type: 'code', node });
		nodes.push(node);
	}

	if (usesPolyfilledChain(nodes)) return null;

	// Mirrors the branch condition in ExpressionBuilder.getExpressionCode.
	const isWholeValue = chunks.length === 2 && chunks[0].type === 'text' && chunks[0].text === '';

	return { chunks, isWholeValue };
}

export function getCompiled(expression: string): CompiledExpression | null {
	if (expression.length > MAX_CACHED_EXPRESSION_LENGTH) return compile(expression);

	let compiled = cache.get(expression);

	if (compiled === undefined) {
		compiled = compile(expression);
		cache.set(expression, compiled);
	}

	return compiled;
}
