export interface ExpressionText {
	type: 'text';
	text: string;
}

export interface ExpressionCode {
	type: 'code';
	text: string;
	// tmpl has different behaviours if the last expression
	// doesn't close itself.
	hasClosingBrackets: boolean;
}

export type ExpressionChunk = ExpressionCode | ExpressionText;

const OPEN_BRACKET = /(?<escape>\\|)(?<brackets>\{\{)/;
const CLOSE_BRACKET = /(?<escape>\\|)(?<brackets>\}\})/;

export const escapeCode = (text: string): string => {
	return text.replace('\\}}', '}}');
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

// Expressions only have closing brackets escaped
const escapeTmplExpression = (part: string) => {
	return part.replace('}}', '\\}}');
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
