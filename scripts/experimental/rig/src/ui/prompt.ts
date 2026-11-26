import * as clack from '@clack/prompts';

import { CancelledError } from '../errors';

export function isInteractive(): boolean {
	return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function orCancel<T>(value: T | typeof clack.CANCEL_SYMBOL): T {
	if (value === clack.CANCEL_SYMBOL) {
		clack.cancel('Cancelled.');
		throw new CancelledError();
	}
	return value;
}

export interface Choice<Value> {
	value: Value;
	label: string;
	hint?: string;
}

/** clack types option values strictly, so pass indexes and map them back. */
function indexedOptions<Value>(choices: Array<Choice<Value>>) {
	return choices.map((choice, index) => ({
		value: String(index),
		label: choice.label,
		hint: choice.hint,
	}));
}

/** Asks the user to pick one option with the arrow keys. */
export async function select<Value>(
	message: string,
	choices: Array<Choice<Value>>,
	initialValue?: Value,
): Promise<Value> {
	const initialIndex = choices.findIndex((choice) => choice.value === initialValue);
	const index = orCancel(
		await clack.select({
			message,
			options: indexedOptions(choices),
			initialValue: initialIndex === -1 ? undefined : String(initialIndex),
		}),
	);
	return choices[Number(index)].value;
}

/** Asks the user to pick options with the arrow keys and the space bar. */
export async function multiselect<Value>(
	message: string,
	choices: Array<Choice<Value>>,
	initialValues: Value[],
	options: { required?: boolean } = {},
): Promise<Value[]> {
	const indexes = orCancel(
		await clack.multiselect({
			message,
			options: indexedOptions(choices),
			initialValues: choices
				.map((choice, index) => (initialValues.includes(choice.value) ? String(index) : undefined))
				.filter((index): index is string => index !== undefined),
			required: options.required ?? true,
		}),
	);
	return indexes.map((index) => choices[Number(index)].value);
}

/**
 * Asks the user to type a search and pick one match with the arrow keys.
 * `rank` returns the matches for the typed text, best first. Return the same
 * choice objects for the same items, so the focus stays on them while the user types.
 */
export async function search<Value>(
	message: string,
	rank: (term: string) => Array<Choice<Value>>,
	options: { placeholder?: string; maxItems?: number } = {},
): Promise<Value> {
	// clack calls `options()` on every render and keeps the focus on the same value.
	// Ids stay stable while the search text stays the same, so the arrow keys work.
	// A new search text gets new ids, so the focus moves to the best match.
	let ids = new WeakMap<Choice<Value>, string>();
	let lastTerm: string | undefined;
	const values = new Map<string, Value>();
	const idOf = (choice: Choice<Value>) => {
		let id = ids.get(choice);
		if (id === undefined) {
			id = String(values.size);
			ids.set(choice, id);
			values.set(id, choice.value);
		}
		return id;
	};

	const id = orCancel(
		await clack.autocomplete<string>({
			message,
			options() {
				const term = this.userInput;
				if (term !== lastTerm) {
					lastTerm = term;
					ids = new WeakMap();
				}
				return rank(term).map((choice) => ({
					value: idOf(choice),
					label: choice.label,
					hint: choice.hint,
				}));
			},
			// `rank` already filters. clack would otherwise filter its result again by label.
			filter: () => true,
			placeholder: options.placeholder,
			maxItems: options.maxItems ?? 12,
		}),
	);
	const value = values.get(id);
	if (value === undefined) throw new CancelledError();
	return value;
}

export async function ask(
	message: string,
	options: {
		defaultValue?: string;
		initialValue?: string;
		placeholder?: string;
		validate?: (value: string) => string | undefined;
	} = {},
): Promise<string> {
	const value = orCancel(
		await clack.text({
			message,
			placeholder: options.placeholder ?? options.defaultValue,
			defaultValue: options.defaultValue,
			initialValue: options.initialValue,
			validate: (input) => {
				const text = input ?? '';
				return options.validate?.(text.length > 0 ? text : (options.defaultValue ?? ''));
			},
		}),
	);
	return value.length > 0 ? value : (options.defaultValue ?? '');
}

/** Asks for a value and masks the input. */
export async function password(message: string): Promise<string> {
	return orCancel(await clack.password({ message }));
}

export async function confirm(message: string, initialValue = true): Promise<boolean> {
	return orCancel(await clack.confirm({ message, initialValue }));
}

export const intro = clack.intro;
export const outro = clack.outro;
export const note = clack.note;
export const log = clack.log;
export const spinner = clack.spinner;
