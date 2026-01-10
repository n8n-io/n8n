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
const CLOSE_BRACKET = /(?<escape>\\|)(?<brackets>\}\})/;

export const escapeCode = (text: string): string => {
	return text.replace('\\}}', '}}');
};

/**
 * Checks if a position in a string is inside a quoted string.
 * Handles single quotes, double quotes, and backticks, with escape sequence support.
 */
const isInsideString = (text: string, position: number): boolean => {
	let inSingleQuote = false;
	let inDoubleQuote = false;
	let inBacktick = false;

	for (let i = 0; i < position; i++) {
		const char = text[i];
		const prevChar = i > 0 ? text[i - 1] : '';

		// Skip escaped characters
		if (prevChar === '\\') {
			continue;
		}

		if (char === "'" && !inDoubleQuote && !inBacktick) {
			inSingleQuote = !inSingleQuote;
		} else if (char === '"' && !inSingleQuote && !inBacktick) {
			inDoubleQuote = !inDoubleQuote;
		} else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
			inBacktick = !inBacktick;
		}
	}

	return inSingleQuote || inDoubleQuote || inBacktick;
};

export const splitExpression = (expression: string): ExpressionChunk[] => {
	const chunks: ExpressionChunk[] = [];
	let searchingFor: 'open' | 'close' = 'open';
	let activeRegex = OPEN_BRACKET;

	let buffer = '';

	let index = 0;

	while (index < expression.length) {
		const expr = expression.slice(index);
		const res = activeRegex.exec(expr);
		// No more brackets. If it's a closing bracket
		// this is sort of valid so we accept it but mark
		// that it has no closing bracket.
		if (!res?.groups) {
			buffer += expr;
			if (searchingFor === 'open') {
				chunks.push({
					type: 'text',
					text: buffer,
				});
			} else {
				chunks.push({
					type: 'code',
					text: escapeCode(buffer),
					hasClosingBrackets: false,
				});
			}
			break;
		}
		if (res.groups.escape) {
			buffer += expr.slice(0, res.index + 3);
			index += res.index + 3;
		} else {
			// When searching for close bracket, check if it's inside a string
			if (
				searchingFor === 'close' &&
				isInsideString(buffer + expr.slice(0, res.index), res.index + buffer.length)
			) {
				// The }} is inside a string, skip it and continue searching
				buffer += expr.slice(0, res.index + 2);
				index += res.index + 2;
				continue;
			}

			buffer += expr.slice(0, res.index);

			if (searchingFor === 'open') {
				chunks.push({
					type: 'text',
					text: buffer,
				});
				searchingFor = 'close';
				activeRegex = CLOSE_BRACKET;
			} else {
				chunks.push({
					type: 'code',
					text: escapeCode(buffer),
					hasClosingBrackets: true,
				});
				searchingFor = 'open';
				activeRegex = OPEN_BRACKET;
			}

			index += res.index + 2;
			buffer = '';
		}
	}

	return chunks;
};

// Expressions only have closing brackets escaped, but not those inside strings
const escapeTmplExpression = (part: string) => {
	let result = '';
	let i = 0;

	while (i < part.length) {
		// Check for }}
		if (part[i] === '}' && part[i + 1] === '}') {
			// Only escape if not inside a string
			if (!isInsideString(part, i)) {
				result += '\\}}';
				i += 2;
				continue;
			}
		}
		result += part[i];
		i++;
	}

	return result;
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
