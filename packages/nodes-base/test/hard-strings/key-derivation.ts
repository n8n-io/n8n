import fc from 'fast-check';

import { familyByName, families, hardString } from './index';
import type { FamilyName } from './index';

export interface KeyDerivationContract {
	/** Every derived key matches this pattern. */
	keyPattern?: RegExp;
	/** Families to test. Default: all of them. */
	families?: FamilyName[];
}

/**
 * The shared contract of a function that derives an output key from user
 * text: the same input gives the same key, and generated text of every
 * family gives a key of the expected shape.
 */
export const describeKeyDerivation = (
	title: string,
	derive: (input: string) => string | undefined,
	contract: KeyDerivationContract = {},
) => {
	const names = contract.families ?? families.map((family) => family.name);

	describe(title, () => {
		it('derives the same key for the same input', () => {
			fc.assert(
				fc.property(hardString(...names), (input) => {
					expect(derive(input)).toBe(derive(input));
				}),
			);
		});

		if (contract.keyPattern) {
			const { keyPattern } = contract;
			it.each(names.map(familyByName))(
				'derives keys that match the pattern for $name',
				(family) => {
					fc.assert(
						fc.property(family.arbitrary, (input) => {
							const key = derive(input);
							if (key !== undefined) expect(key).toMatch(keyPattern);
						}),
					);
				},
			);
		}
	});
};
