// @ts-check

/**
 * Converts an object of flags to an array of CLI arguments.
 *
 * @param {Record<string, string | undefined>} flags
 *
 * @returns {string[]}
 */
export function flagsObjectToCliArgs(flags) {
	return Object.entries(flags)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => {
			if (typeof value === 'string' && value.includes(' ')) {
				return `--${key}="${value}"`;
			} else {
				return `--${key}=${value}`;
			}
		});
}
