type FlattenedArray = (string | number | boolean | null | undefined | object)[];
type KnownMap = Map<any, string>;
type StringConstructor = typeof String;

const STRING_TYPE = 'string';
const OBJECT_TYPE = 'object';
const IGNORE_PLACEHOLDER = {};
const StringWrapper: StringConstructor = String;

// NOTE: BigInt.prototype.toJSON is not available, which causes serialization. This is a workaround for that.
BigInt.prototype.toJSON = function () {
	return this.toString();
};

/** Handles primitive value conversion during serialization */
const convertPrimitive = (value: any): any =>
	value instanceof StringWrapper ? StringWrapper(value) : value;

/** Reviver function used during JSON parsing to handle primitive conversions */
const primitiveReviver = (_: string, value: any): any =>
	typeof value === STRING_TYPE ? new StringWrapper(value) : value;

/**
 * Recursively revives an object from the flattened format
 * @param input - The complete flattened array
 * @param parsed - Set of already parsed objects to handle circular references
 * @param output - Current object being processed
 */
const reviveObject = (
	input: FlattenedArray,
	parsed: Set<any>,
	output: Record<string, any>,
): any => {
	const lazyReferences: Array<{ key: string; args: [FlattenedArray, Set<any>, any] }> = [];

	for (const key of Object.keys(output)) {
		const value = output[key];

		if (value instanceof StringWrapper) {
			const actualValue = input[value as any];

			if (typeof actualValue === OBJECT_TYPE && !parsed.has(actualValue)) {
				parsed.add(actualValue);
				output[key] = IGNORE_PLACEHOLDER;
				lazyReferences.push({ key, args: [input, parsed, actualValue] });
			} else {
				output[key] = actualValue;
			}
		} else if (output[key] !== IGNORE_PLACEHOLDER) {
			output[key] = value;
		}
	}

	// Handle lazy references to resolve circular dependencies
	for (const { key, args } of lazyReferences) {
		output[key] = reviveObject.apply(null, args);
	}

	return output;
};

/** Sets a value in the flattened array and returns its index */
const setValueInMap = (known: KnownMap, input: any[], value: any): string => {
	const index = StringWrapper(input.push(value) - 1);
	known.set(value, index);
	return index;
};

/**
 * Deserializes a flattened string back into its original JavaScript value
 * @param str - The serialized string to deserialize
 * @returns The deserialized value with its original structure and references
 * @throws If the input string is invalid JSON
 */
export const deserialize = <T = any>(str: string): T => {
	const input = JSON.parse(str, primitiveReviver).map(convertPrimitive);
	const value = input[0];
	return typeof value === OBJECT_TYPE && value ? reviveObject(input, new Set(), value) : value;
};

/**
 * Serializes a JavaScript value into a flattened string format
 * This format preserves circular references and complex object structures
 * @param value - The value to serialize
 * @returns A string representation that can be deserialized back to the original value
 */
export const serialize = <T = any>(value: T): string => {
	const known: KnownMap = new Map();
	const input: any[] = [];
	const output: string[] = [];

	let currentIndex = +setValueInMap(known, input, value);
	let isFirstRun = !currentIndex;

	/** Replacer function for JSON.stringify that handles object references */
	const replacer = (_: string, value: any): any => {
		if (isFirstRun) {
			isFirstRun = false;
			return value;
		}

		switch (typeof value) {
			case OBJECT_TYPE:
				if (value === null) return value;
			// Falls through
			case STRING_TYPE:
				return known.get(value) || setValueInMap(known, input, value);
			default:
				return value;
		}
	};

	while (currentIndex < input.length) {
		isFirstRun = true;
		output[currentIndex] = JSON.stringify(input[currentIndex++], replacer);
	}

	return '[' + output.join(',') + ']';
};
