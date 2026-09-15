import fc from 'fast-check';

import { deriveOutputKey } from '../src/output-key';
import type { OutputKeyStrategy } from '../src/output-key';
import golden from './fixtures/output-key.golden.json';

// Generated once from change-case 4.1.2 (ascii) and 5.4.4 (unicode). Do not regenerate to make a test pass.
const GOLDEN: Record<Exclude<OutputKeyStrategy, 'verbatim'>, Record<string, string>> = golden;

const ASCII_SNAKE = /^[a-z0-9]+(_[a-z0-9]+)*$|^$/;
const foldToAscii = (name: string) => name.replace(/[^\x20-\x7E]/g, ' ');

const unicodeName = fc.string({ unit: 'grapheme', minLength: 0, maxLength: 24 });

describe('deriveOutputKey', () => {
	describe('verbatim', () => {
		it('returns the name unchanged', () => {
			fc.assert(
				fc.property(unicodeName, (name) => {
					expect(deriveOutputKey(name, { strategy: 'verbatim' })).toBe(name);
				}),
			);
		});
	});

	describe('snake_case_ascii', () => {
		it.each(Object.entries(GOLDEN.snake_case_ascii))(
			'matches change-case 4.1.2 for %j',
			(name, expected) => {
				expect(deriveOutputKey(name, { strategy: 'snake_case_ascii' })).toBe(expected);
			},
		);

		it('produces lowercase ASCII words joined by single underscores', () => {
			fc.assert(
				fc.property(unicodeName, (name) => {
					expect(deriveOutputKey(name, { strategy: 'snake_case_ascii' })).toMatch(ASCII_SNAKE);
				}),
			);
		});

		it('treats every non-ASCII character as a word separator', () => {
			fc.assert(
				fc.property(unicodeName, (name) => {
					expect(deriveOutputKey(name, { strategy: 'snake_case_ascii' })).toBe(
						deriveOutputKey(foldToAscii(name), { strategy: 'snake_case_unicode' }),
					);
				}),
			);
		});
	});

	describe('snake_case_unicode', () => {
		it.each(Object.entries(GOLDEN.snake_case_unicode))(
			'matches change-case 5.4.4 for %j',
			(name, expected) => {
				expect(deriveOutputKey(name, { strategy: 'snake_case_unicode' })).toBe(expected);
			},
		);

		it('keeps a lowercase word of any script verbatim', () => {
			const lowercaseWord = unicodeName.filter((name) => /^\p{Ll}+$/u.test(name));

			fc.assert(
				fc.property(lowercaseWord, (name) => {
					expect(deriveOutputKey(name, { strategy: 'snake_case_unicode' })).toBe(name);
				}),
				{ examples: [['prénom'], ['straße'], ['κόσμος'], ['имя']] },
			);
		});

		it('never contains leading, trailing, or doubled underscores', () => {
			fc.assert(
				fc.property(unicodeName, (name) => {
					const key = deriveOutputKey(name, { strategy: 'snake_case_unicode' });
					expect(key).not.toMatch(/^_|_$|__/);
				}),
			);
		});
	});

	describe('snake_case strategies', () => {
		const snakeStrategies: OutputKeyStrategy[] = ['snake_case_ascii', 'snake_case_unicode'];

		// Lowercasing can add combining marks (İ → i̇) or leave letters that have no
		// lowercase form (𝐀); a second pass treats those as separators or boundaries.
		const stableName = unicodeName.filter((name) => !/\p{M}|\p{Lu}/u.test(name.toLowerCase()));

		it.each(snakeStrategies)('%s is idempotent', (strategy) => {
			fc.assert(
				fc.property(stableName, (name) => {
					const once = deriveOutputKey(name, { strategy });
					expect(deriveOutputKey(once, { strategy })).toBe(once);
				}),
			);
		});

		it('snake_case_unicode treats the combining mark that lowercasing İ adds as a separator', () => {
			expect(deriveOutputKey('İstanbul', { strategy: 'snake_case_unicode' })).toBe(
				'i\u0307stanbul',
			);
			expect(deriveOutputKey('i\u0307stanbul', { strategy: 'snake_case_unicode' })).toBe(
				'i_stanbul',
			);
		});

		it.each(snakeStrategies)('%s never yields a prototype-polluting key', (strategy) => {
			for (const name of ['__proto__', '__PROTO__', ' __proto__ ']) {
				expect(deriveOutputKey(name, { strategy })).toBe('proto');
			}
		});
	});

	describe('prefix', () => {
		it('joins the prefix and the key with an underscore, even for an empty key', () => {
			expect(
				deriveOutputKey('First Name', { strategy: 'snake_case_ascii', prefix: 'property' }),
			).toBe('property_first_name');
			expect(deriveOutputKey('日本語', { strategy: 'snake_case_ascii', prefix: 'property' })).toBe(
				'property_',
			);
		});

		it('prefixes the key the strategy derives on its own', () => {
			fc.assert(
				fc.property(unicodeName, fc.stringMatching(/^[a-z]{1,8}$/), (name, prefix) => {
					const key = deriveOutputKey(name, { strategy: 'snake_case_unicode' });
					expect(deriveOutputKey(name, { strategy: 'snake_case_unicode', prefix })).toBe(
						`${prefix}_${key}`,
					);
				}),
			);
		});
	});
});
