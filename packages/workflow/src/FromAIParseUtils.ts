import { z } from 'zod';

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
		case 'json':
			schema = z.record(z.any());
			break;
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

/**
 * Parses the default value, preserving its original type.
 * @param value The default value as a string.
 * @returns The parsed default value in its appropriate type.
 */
function parseDefaultValue(
	value: string | undefined,
): string | number | boolean | Record<string, unknown> | undefined {
	if (value === undefined || value === '') return undefined;
	const lowerValue = value.toLowerCase();
	if (lowerValue === 'true') return true;
	if (lowerValue === 'false') return false;
	if (!isNaN(Number(value))) return Number(value);
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

	const type = cleanArgs?.[2] || 'string';

	if (!['string', 'number', 'boolean', 'json'].includes(type.toLowerCase())) {
		throw new ParseError(`Invalid type: ${type}`);
	}

	return {
		key: cleanArgs[0] || '',
		description: cleanArgs[1],
		type: (cleanArgs?.[2] ?? 'string') as FromAIArgumentType,
		defaultValue: parseDefaultValue(cleanArgs[3]),
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
