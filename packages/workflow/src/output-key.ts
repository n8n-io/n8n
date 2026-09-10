/**
 * Output field names derived from user data (a Notion property, a sheet header).
 * Each strategy is frozen: users reference the keys in expressions, so new
 * behavior gets a new strategy name. No casing library, so no upgrade can
 * rename fields.
 */

export type OutputKeyStrategy =
	/** The name as given. */
	| 'verbatim'
	/** snake_case over ASCII; every other character separates words: `Prénom` → `pr_nom`. change-case v4 behavior. */
	| 'snake_case_ascii'
	/** snake_case that keeps letters of every script: `Prénom` → `prénom`. change-case v5 behavior. */
	| 'snake_case_unicode';

export interface DeriveOutputKeyOptions {
	strategy: OutputKeyStrategy;
	/** Joined to the key with `_`: `property` → `property_first_name`. */
	prefix?: string;
}

interface SnakeCaseRules {
	/** Word boundaries inside a token, as in `fooBar` and `HTMLParser`. */
	split: RegExp[];
	/** Separators between words, dropped. */
	strip: RegExp;
}

const ASCII_RULES: SnakeCaseRules = {
	split: [/([a-z0-9])([A-Z])/g, /([A-Z])([A-Z][a-z])/g],
	strip: /[^A-Z0-9]+/gi,
};

const UNICODE_RULES: SnakeCaseRules = {
	split: [/([\p{Ll}\d])(\p{Lu})/gu, /(\p{Lu})([\p{Lu}][\p{Ll}])/gu],
	strip: /[^\p{L}\d]+/giu,
};

const WORD_BOUNDARY = '\0';

function snakeCase(input: string, rules: SnakeCaseRules): string {
	let marked = input;
	for (const boundary of rules.split) {
		marked = marked.replace(boundary, `$1${WORD_BOUNDARY}$2`);
	}
	marked = marked.replace(rules.strip, WORD_BOUNDARY);

	let start = 0;
	let end = marked.length;
	while (start < end && marked.charAt(start) === WORD_BOUNDARY) start++;
	while (end > start && marked.charAt(end - 1) === WORD_BOUNDARY) end--;

	return marked
		.slice(start, end)
		.split(WORD_BOUNDARY)
		.map((word) => word.toLowerCase())
		.join('_');
}

/**
 * @example
 * deriveOutputKey('Prénom', { strategy: 'snake_case_ascii', prefix: 'property' }); // 'property_pr_nom'
 * deriveOutputKey('Prénom', { strategy: 'snake_case_unicode' }); // 'prénom'
 */
export function deriveOutputKey(name: string, options: DeriveOutputKeyOptions): string {
	let key: string;
	switch (options.strategy) {
		case 'verbatim':
			key = name;
			break;
		case 'snake_case_ascii':
			key = snakeCase(name, ASCII_RULES);
			break;
		case 'snake_case_unicode':
			key = snakeCase(name, UNICODE_RULES);
			break;
	}
	return options.prefix === undefined ? key : `${options.prefix}_${key}`;
}
