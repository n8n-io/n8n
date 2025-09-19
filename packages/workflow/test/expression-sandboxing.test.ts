import { Tournament } from '@n8n/tournament';

import { PrototypeSanitizer, sanitizer } from '../src/expression-sandboxing';

const tournament = new Tournament(
	(e) => {
		throw e;
	},
	undefined,
	undefined,
	{
		before: [],
		after: [PrototypeSanitizer],
	},
);

const errorRegex = /^Cannot access ".*" due to security concerns$/;

describe('PrototypeSanitizer', () => {
	describe('Static analysis', () => {
		it('should not allow access to __proto__', () => {
			expect(() => {
				tournament.execute('{{ ({}).__proto__.__proto__ }}', {});
			}).toThrowError(errorRegex);

			expect(() => {
				tournament.execute('{{ ({})["__proto__"]["__proto__"] }}', {});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to prototype', () => {
			expect(() => {
				tournament.execute('{{ Number.prototype }}', { Number });
			}).toThrowError(errorRegex);

			expect(() => {
				tournament.execute('{{ Number["prototype"] }}', { Number });
			}).toThrowError(errorRegex);
		});

		it('should not allow access to constructor', () => {
			expect(() => {
				tournament.execute('{{ Number.constructor }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);

			expect(() => {
				tournament.execute('{{ Number["constructor"] }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);
		});
	});

	describe('Runtime', () => {
		it('should not allow access to __proto__', () => {
			expect(() => {
				tournament.execute('{{ ({})["__" + (() => "proto")() + "__"] }}', {
					__sanitize: sanitizer,
				});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to prototype', () => {
			expect(() => {
				tournament.execute('{{ Number["pro" + (() => "toty")() + "pe"] }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);
		});

		it('should not allow access to constructor', () => {
			expect(() => {
				tournament.execute('{{ Number["cons" + (() => "truc")() + "tor"] }}', {
					__sanitize: sanitizer,
					Number,
				});
			}).toThrowError(errorRegex);
		});
	});
});
