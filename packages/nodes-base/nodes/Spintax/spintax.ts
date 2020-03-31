//
/**
 * mel-spintax
 *
 * Parse Spintax formatted text (Nested Spintax supported)
 *
 * @copyright 2015 Dmitry Gureev
 * @license MIT Licensed
 *
 * Examples:
 *     // Get unspinned text
 *     console.log(spintax.unspin('{Hello|Hi} John!'));
 *     // >>> "Hello John!" or "Hi John!"
 *
 *     // Get unspinned text from Nested Spintax
 *     console.log(spintax.unspin('{Hello|Hi {there|again}} John!'));
 *     // >>> "Hello John!" or "Hi there John!" or "Hi again John!"
 *
 *     // Count unique variations
 *     console.log(spintax.count('{Hello|Hi {there|again}} John!'));
 *     // >>> 3
 *
 *     // Validate format
 *     console.log(spintax.validate('{Hello|Hi} John!'));
 *     // >>> true
 *     console.log(spintax.validate('{Hello|Hi John!'));
 *     // >>> false
 */

/**
 * Check text is Spintax
 *
 * @param text {String} Spintax formatted string
 * @return {Boolean}
 */
export function isSpintax(text: string) {
	return text.match(/\{[^}]*\|*[^}]*\}/) !== null;
}

/**
 * Find and return array of first Spintax occurence or null
 *
 * @param text {String} Spintax formatted string
 * @return {null|Array}
 */
export function findSpintax(text: string) {
	return text.match(/\{([^{}]+?)\}/);
}

/**
 * Unspin Spintax text
 *
 * @param text {String} Spintax formatted text
 * @param [randomFn] {Function} Custom Random Function that returns b/w 0-1
 * @return {String}
 */
export function unspin(text: string, randomFn?: () => number) {
	let spin;
	let options;
	let choice;
	const originalText = text;
	let unspinCount = 0;

	// While we find Spintax keep unspinning it
	while (exports.isSpintax(text)) {
		if (unspinCount >= 1000) {
			throw new Error('Unable unspin text after 1000 iterations (' + originalText + ')');
		}

		// Find first Spintax occurrence
		spin = exports.findSpintax(text);

		// Put the Spintax options in an array
		options = spin[1].split('|');

		// Choose a random option based on the options length
		choice = options[Math.floor((randomFn || Math.random)() * options.length)];

		// Put our unspun choice back into text
		text = text.replace(spin[0], choice);

		// Increase unspin counter
		unspinCount++;
	}

	return text;
}

/**
 * Count Spintax variations
 *
 * @param text {String} Spintax formatted text
 * @return {Number}
 */
export function count(text: string) {
	let spin;
	let options;
	let num;
	let total = 0;
	let i;
	const reFind = /%%%\d+%%%/g;
	const reParse = /%%%(\d+)%%%/;
	const ps = 'N';
	const pm = '%%%' + ps + '%%%';
	const originalText = text;
	let unspinCount = 0;

	while (exports.isSpintax(text)) {
		if (unspinCount >= 1000) {
			throw new Error('Unable unspin text after 1000 iterations (' + originalText + ')');
		}

		spin = exports.findSpintax(text);
		options = spin[1].split('|');
		num = 0;

		for (i = 0; i < options.length; i++) {
			if (options[i].match(reFind)) {
				// tslint:disable-next-line: radix
				num += parseInt(options[i].match(reParse)[1]) || 1;
			}
			else {
				num += 1;
			}
		}

		text = text.replace(spin[0], pm.replace(ps, num.toString()));

		// Increase unspin counter
		unspinCount++;
	}

	if (text.match(reFind)) {
		const totals = text.match(reFind)!;
		total = 1;

		for (i = 0; i < totals.length; i++) {
			// tslint:disable-next-line: radix
			total *= parseInt(totals[i].match(reParse)![1]) || 1;
		}
	}

	return total;
}

/**
 * Check given text for a valid Spintax-format
 *
 * @param text {String} Spintax formatted text
 * @return {Boolean}
 */
export function validate(text: string) {
	// Unspin text
	text = exports.unspin(text);

	// Check text for remaining Spintax format sequences: { then | or | then }
	return text.match(/(\{[^}]*\|)|(\|[^{]*\})/) === null;
}
