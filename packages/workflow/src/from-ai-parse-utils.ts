import { z } from 'zod';

import { FROM_AI_AUTO_GENERATED_MARKER } from './constants';
import { isExpression } from './expressions/expression-helpers';
import { jsonParse } from './utils';

/**
 * This file contains the logic for parsing node parameters and extracting $fromAI calls
 */

export type FromAIArgumentType = 'string' | 'number' | 'boolean' | 'json';
export type FromAIArgument = {
	key: string;
	description?: string;
	type?: FromAIArgumentType;
	defaultValue?: string | number | boolean | Record<string, unknown>;
};

class ParseError extends Error {}

/**
 * Generates a Zod schema based on the provided FromAIArgument placeholder.
 * @param placeholder The FromAIArgument object containing key, type, description, and defaultValue.
 * @returns A Zod schema corresponding to the placeholder's type and constraints.
 */
export function generateZodSchema(placeholder: FromAIArgument): z.ZodTypeAny {
	let schema: z.ZodTypeAny;

	switch (placeholder.type?.toLowerCase()) {
		case 'string':
			schema = z.string();
			break;
		case 'number':
			schema = z.number();
			break;
		case 'boolean':
			schema = z.boolean();
			break;
		case 'json': {
			interface CustomSchemaDef extends z.ZodTypeDef {
				jsonSchema?: {
					anyOf: [
						{
							type: 'object';
							minProperties: number;
							additionalProperties: boolean;
						},
						{
							type: 'array';
							minItems: number;
						},
					];
				};
			}

			// Create a custom schema to validate that the incoming data is either a non-empty object or a non-empty array.
			const customSchema = z.custom<Record<string, unknown> | unknown[]>(
				(data: unknown) => {
					if (data === null || typeof data !== 'object') return false;
					if (Array.isArray(data)) {
						return data.length > 0;
					}
					return Object.keys(data).length > 0;
				},
				{
					message: 'Value must be a non-empty object or a non-empty array',
				},
			);

			// Cast the custom schema to a type that includes our JSON metadata.
			const typedSchema = customSchema as z.ZodType<
				Record<string, unknown> | unknown[],
				CustomSchemaDef
			>;

			// Attach the updated `jsonSchema` metadata to the internal definition.
			typedSchema._def.jsonSchema = {
				anyOf: [
					{
						type: 'object',
						minProperties: 1,
						additionalProperties: true,
					},
					{
						type: 'array',
						minItems: 1,
					},
				],
			};

			schema = typedSchema;
			break;
		}
		default:
			schema = z.string();
	}

	if (placeholder.description) {
		schema = schema.describe(`${schema.description ?? ''} ${placeholder.description}`.trim());
	}

	if (placeholder.defaultValue !== undefined) {
		schema = schema.default(placeholder.defaultValue);
	}

	return schema;
}

function isFromAIArgumentType(value: string): value is FromAIArgumentType {
	return ['string', 'number', 'boolean', 'json'].includes(value.toLowerCase());
}

/**
 * Parses the default value, preserving its original type.
 * @param value The default value as a string.
 * @param type The expected type of the default value.
 * @returns The parsed default value in its appropriate type.
 */
function parseDefaultValue(
	value: string | undefined,
	type: FromAIArgumentType = 'string',
): string | number | boolean | Record<string, unknown> | undefined {
	if (value === undefined) return value;

	const lowerValue = value.toLowerCase();
	if (type === 'string') {
		return value.toString();
	}

	if (type === 'boolean' && (lowerValue === 'true' || lowerValue === 'false'))
		return lowerValue === 'true';
	if (type === 'number' && !isNaN(Number(value))) return Number(value);

	// For type 'json' or any other case, attempt to parse as JSON
	try {
		return jsonParse(value);
	} catch {
		return value;
	}
}

/**
 * Parses the arguments of a single $fromAI function call.
 * @param argsString The string containing the function arguments.
 * @returns A FromAIArgument object.
 */
function parseArguments(argsString: string): FromAIArgument {
	// Split arguments by commas not inside quotes
	const args: string[] = [];
	let currentArg = '';
	let inQuotes = false;
	let quoteChar = '';
	let escapeNext = false;

	for (let i = 0; i < argsString.length; i++) {
		const char = argsString[i];

		if (escapeNext) {
			currentArg += char;
			escapeNext = false;
			continue;
		}

		if (char === '\\') {
			escapeNext = true;
			continue;
		}

		if (['"', "'", '`'].includes(char)) {
			if (!inQuotes) {
				inQuotes = true;
				quoteChar = char;
				currentArg += char;
			} else if (char === quoteChar) {
				inQuotes = false;
				quoteChar = '';
				currentArg += char;
			} else {
				currentArg += char;
			}
			continue;
		}

		if (char === ',' && !inQuotes) {
			args.push(currentArg.trim());
			currentArg = '';
			continue;
		}

		currentArg += char;
	}

	if (currentArg) {
		args.push(currentArg.trim());
	}

	// Remove surrounding quotes if present
	const cleanArgs = args.map((arg) => {
		const trimmed = arg.trim();
		if (
			(trimmed.startsWith("'") && trimmed.endsWith("'")) ||
			(trimmed.startsWith('`') && trimmed.endsWith('`')) ||
			(trimmed.startsWith('"') && trimmed.endsWith('"'))
		) {
			return trimmed
				.slice(1, -1)
				.replace(/\\'/g, "'")
				.replace(/\\`/g, '`')
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, '\\');
		}
		return trimmed;
	});

	const type = cleanArgs?.[2] ?? 'string';

	if (!isFromAIArgumentType(type)) {
		throw new ParseError(`Invalid type: ${type}`);
	}

	return {
		key: cleanArgs[0] || '',
		description: cleanArgs[1],
		type,
		defaultValue: parseDefaultValue(cleanArgs[3], type),
	};
}

/**
 * Extracts all $fromAI calls from a given string
 * @param str The string to search for $fromAI calls.
 * @returns An array of FromAIArgument objects.
 *
 * This method uses a regular expression to find the start of each $fromAI function call
 * in the input string. It then employs a character-by-character parsing approach to
 * accurately extract the arguments of each call, handling nested parentheses and quoted strings.
 *
 * The parsing process:
 * 1. Finds the starting position of a $fromAI call using regex.
 * 2. Iterates through characters, keeping track of parentheses depth and quote status.
 * 3. Handles escaped characters within quotes to avoid premature quote closing.
 * 4. Builds the argument string until the matching closing parenthesis is found.
 * 5. Parses the extracted argument string into a FromAIArgument object.
 * 6. Repeats the process for all $fromAI calls in the input string.
 *
 */
export function extractFromAICalls(str: string): FromAIArgument[] {
	const args: FromAIArgument[] = [];
	// Regular expression to match the start of a $fromAI function call
	const pattern = /\$fromAI\s*\(\s*/gi;
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(str)) !== null) {
		const startIndex = match.index + match[0].length;
		let current = startIndex;
		let inQuotes = false;
		let quoteChar = '';
		let parenthesesCount = 1;
		let argsString = '';

		// Parse the arguments string, handling nested parentheses and quotes
		while (current < str.length && parenthesesCount > 0) {
			const char = str[current];

			if (inQuotes) {
				// Handle characters inside quotes, including escaped characters
				if (char === '\\' && current + 1 < str.length) {
					argsString += char + str[current + 1];
					current += 2;
					continue;
				}

				if (char === quoteChar) {
					inQuotes = false;
					quoteChar = '';
				}
				argsString += char;
			} else {
				// Handle characters outside quotes
				if (['"', "'", '`'].includes(char)) {
					inQuotes = true;
					quoteChar = char;
				} else if (char === '(') {
					parenthesesCount++;
				} else if (char === ')') {
					parenthesesCount--;
				}

				// Only add characters if we're still inside the main parentheses
				if (parenthesesCount > 0 || char !== ')') {
					argsString += char;
				}
			}

			current++;
		}

		// If parentheses are balanced, parse the arguments
		if (parenthesesCount === 0) {
			try {
				const parsedArgs = parseArguments(argsString);
				args.push(parsedArgs);
			} catch (error) {
				// If parsing fails, throw an ParseError with details
				throw new ParseError(`Failed to parse $fromAI arguments: ${argsString}: ${String(error)}`);
			}
		} else {
			// Log an error if parentheses are unbalanced
			throw new ParseError(
				`Unbalanced parentheses while parsing $fromAI call: ${str.slice(startIndex)}`,
			);
		}
	}

	return args;
}

/**
 * Recursively traverses the nodeParameters object to find all $fromAI calls.
 * @param payload The current object or value being traversed.
 * @param collectedArgs The array collecting FromAIArgument objects.
 */
export function traverseNodeParameters(payload: unknown, collectedArgs: FromAIArgument[]) {
	if (typeof payload === 'string') {
		const fromAICalls = extractFromAICalls(payload);
		fromAICalls.forEach((call) => collectedArgs.push(call));
	} else if (Array.isArray(payload)) {
		payload.forEach((item: unknown) => traverseNodeParameters(item, collectedArgs));
	} else if (typeof payload === 'object' && payload !== null) {
		Object.values(payload).forEach((value) => traverseNodeParameters(value, collectedArgs));
	}
}

export function traverseNodeParametersWithParamNames(
	payload: unknown,
	collectedArgs: Map<string, FromAIArgument>,
	name?: string,
) {
	if (typeof payload === 'string') {
		const fromAICalls = extractFromAICalls(payload);
		fromAICalls.forEach((call) => collectedArgs.set(name as string, call));
	} else if (Array.isArray(payload)) {
		payload.forEach((item: unknown, index: number) =>
			traverseNodeParametersWithParamNames(item, collectedArgs, name + `[${index}]`),
		);
	} else if (typeof payload === 'object' && payload !== null) {
		for (const [key, value] of Object.entries(payload)) {
			traverseNodeParametersWithParamNames(value, collectedArgs, name ? name + '.' + key : key);
		}
	}
}

/**
 * Checks whether an expression string contains only a single `$fromAI()` call
 * with literal arguments and nothing else.
 *
 * Only `$fromAI()` expressions are supported in chat hub tool parameters.
 * Arguments must be literals (strings, numbers, booleans) — nested function
 * calls like `$fromAI(evil())` are not supported.
 */
export function isFromAIOnlyExpression(expr: string): boolean {
	let str = expr;

	// Strip leading `=` prefix
	if (str.startsWith('=')) {
		str = str.slice(1);
	}

	str = str.trim();

	// Strip `{{ }}` delimiters if present
	if (str.startsWith('{{') && str.endsWith('}}')) {
		str = str.slice(2, -2).trim();
	}

	// Strip optional auto-generated marker comment
	if (str.startsWith(FROM_AI_AUTO_GENERATED_MARKER)) {
		str = str.slice(FROM_AI_AUTO_GENERATED_MARKER.length).trim();
	}

	// Must start with $fromAI( (case-insensitive)
	const fromAIPattern = /^\$fromAI\s*\(/i;
	const match = fromAIPattern.exec(str);
	if (!match) {
		return false;
	}

	// Walk character by character from after the opening `(` to find matching `)`
	// Reject any nested parentheses outside quotes (indicates function calls)
	const startIndex = match[0].length;
	let current = startIndex;
	let inQuotes = false;
	let quoteChar = '';
	let depth = 1;

	let lastOutsideChar = '';

	while (current < str.length && depth > 0) {
		const char = str[current];

		if (inQuotes) {
			if (char === '\\' && current + 1 < str.length) {
				// Skip escaped character
				current += 2;
				continue;
			}
			// Reject template literal interpolation `${...}` inside backtick strings
			if (
				quoteChar === '`' &&
				char === '$' &&
				current + 1 < str.length &&
				str[current + 1] === '{'
			) {
				return false;
			}
			if (char === quoteChar) {
				inQuotes = false;
				quoteChar = '';
			}
		} else {
			if (['"', "'", '`'].includes(char)) {
				// Reject tagged template literals: identifier immediately before backtick
				if (char === '`' && /[a-zA-Z0-9_]/.test(lastOutsideChar)) {
					return false;
				}
				inQuotes = true;
				quoteChar = char;
			} else if (char === ')') {
				depth--;
			} else if (!/[a-zA-Z0-9.,\s-]/.test(char)) {
				// Outside quotes, only allow literal-value characters:
				// alphanumeric (true/false, numbers), decimal point, minus (negative numbers),
				// comma (argument separator), and whitespace.
				// This rejects operators (+, *, etc.), $ (variable references like $env),
				// brackets, and other expression syntax.
				return false;
			}
			if (!/\s/.test(char)) {
				lastOutsideChar = char;
			}
		}

		current++;
	}

	// Unbalanced parentheses
	if (depth !== 0) {
		return false;
	}

	// Everything after the closing `)` must be whitespace only
	const remainder = str.slice(current).trim();
	return remainder.length === 0;
}

export type ExpressionViolation = {
	path: string;
	value: string;
};

/**
 * Recursively traverses node parameters and finds all string values that are
 * expressions other than supported `$fromAI()`-only expressions supported on Chat hub.
 * Returns an array of violations with their dot-notation paths.
 */
export function findDisallowedChatToolExpressions(
	payload: unknown,
	path = '',
): ExpressionViolation[] {
	const violations: ExpressionViolation[] = [];

	if (typeof payload === 'string') {
		if (isExpression(payload) && !isFromAIOnlyExpression(payload)) {
			violations.push({ path, value: payload });
		}
	} else if (Array.isArray(payload)) {
		payload.forEach((item: unknown, index: number) => {
			violations.push(...findDisallowedChatToolExpressions(item, `${path}[${index}]`));
		});
	} else if (typeof payload === 'object' && payload !== null) {
		for (const [key, value] of Object.entries(payload)) {
			const newPath = path ? `${path}.${key}` : key;
			violations.push(...findDisallowedChatToolExpressions(value, newPath));
		}
	}

	return violations;
}
