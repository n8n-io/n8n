import { parseScript } from 'esprima-next';

export interface ExpressionText {
	type: 'text';
	text: string;
}

export interface ExpressionCode {
	type: 'code';
	text: string;

	// This is to match behavior in our original expression evaluator (tmpl),
	// which has different behaviours if the last expression doesn't close itself.
	hasClosingBrackets: boolean;
}

export type ExpressionChunk = ExpressionCode | ExpressionText;

const OPEN_BRACKET = /(?<escape>\\|)(?<brackets>\{\{)/;
const EXPRESSION_STATEMENT = 'ExpressionStatement';
const EMPTY_STATEMENT = 'EmptyStatement';

export const escapeCode = (text: string): string => {
	return text.replace(/\\}}/g, '}}');
};

const isEscapedClosingBrackets = (expression: string, index: number) =>
	expression[index] === '\\' && expression[index + 1] === '}' && expression[index + 2] === '}';

const hasClosingBrackets = (char: string, nextChar: string) => char === '}' && nextChar === '}';

const parseCandidateProgram = (source: string) => {
	try {
		return parseScript(source);
	} catch {
		return null;
	}
};

const isSentinelExpressionProgram = (source: string) => {
	const program = parseCandidateProgram(source);
	const lastType = String(program?.body.at(-1)?.type);
	return (
		program !== null &&
		program.body.length >= 2 &&
		lastType === EXPRESSION_STATEMENT &&
		program.body
			.slice(0, -1)
			.every(
				(statement) =>
					String(statement.type) === EMPTY_STATEMENT ||
					String(statement.type) === EXPRESSION_STATEMENT,
			)
	);
};

const isParsableExpressionCandidate = (source: string, cache: Map<string, boolean>) => {
	const cached = cache.get(source);
	if (cached !== undefined) {
		return cached;
	}

	const result =
		isSentinelExpressionProgram(`${source};0`) || isSentinelExpressionProgram(`(${source});0`);

	cache.set(source, result);
	return result;
};

function findClosingExpressionIndexByParsing(
	expression: string,
	startIndex: number,
): number | null {
	let code = '';
	const parseableExpressionCache = new Map<string, boolean>();

	for (let index = startIndex; index < expression.length; ) {
		if (isEscapedClosingBrackets(expression, index)) {
			code += '\\}}';
			index += 3;
			continue;
		}

		const char = expression[index];
		const nextChar = expression[index + 1];

		if (hasClosingBrackets(char, nextChar)) {
			if (isParsableExpressionCandidate(code, parseableExpressionCache)) {
				return index;
			}

			code += '}';
			index++;
			continue;
		}

		code += char;
		index++;
	}

	return null;
}

export const splitExpression = (expression: string): ExpressionChunk[] => {
	const chunks: ExpressionChunk[] = [];
	let buffer = '';
	let index = 0;

	while (index < expression.length) {
		const expr = expression.slice(index);
		const res = OPEN_BRACKET.exec(expr);
		if (!res?.groups) {
			chunks.push({
				type: 'text',
				text: buffer + expr,
			});
			break;
		}

		if (res.groups.escape) {
			buffer += expr.slice(0, res.index + 3);
			index += res.index + 3;
		} else {
			buffer += expr.slice(0, res.index);
			chunks.push({
				type: 'text',
				text: buffer,
			});
			buffer = '';

			const expressionStart = index + res.index + 2;
			const closingIndex = findClosingExpressionIndexByParsing(expression, expressionStart);

			if (closingIndex === null) {
				chunks.push({
					type: 'code',
					text: escapeCode(expression.slice(expressionStart)),
					hasClosingBrackets: false,
				});
				break;
			}

			chunks.push({
				type: 'code',
				text: escapeCode(expression.slice(expressionStart, closingIndex)),
				hasClosingBrackets: true,
			});

			index = closingIndex + 2;
		}
	}

	return chunks;
};

// Expressions only have closing brackets escaped
const escapeTmplExpression = (part: string) => {
	return part.replace(/}}/g, '\\}}');
};

export const joinExpression = (parts: ExpressionChunk[]): string => {
	return parts
		.map((chunk) => {
			if (chunk.type === 'code') {
				return `{{${escapeTmplExpression(chunk.text)}${chunk.hasClosingBrackets ? '}}' : ''}`;
			}
			return chunk.text;
		})
		.join('');
};
