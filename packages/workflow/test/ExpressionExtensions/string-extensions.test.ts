// @vitest-environment jsdom
import { DateTime } from 'luxon';

import { evaluate, asDateTime } from './helpers';
import { ExpressionExtensionError } from '../../src/errors';
import { stringExtensions } from '../../src/extensions/string-extensions';

// Direct handles to the pure functions. The VM expression engine swallows a
// thrown extension error into `undefined` and normalises error messages, so the
// `evaluate()` harness can't distinguish "returns undefined" from "throws", nor
// pin a specific error message. Calling the exported functions directly exercises
// the real (mutated) source so those contracts are asserted.
const fns = stringExtensions.functions;
const extractEmail = fns.extractEmail as (v: string) => string | undefined;
const extractUrl = fns.extractUrl as (v: string) => string | undefined;
const extractDomain = fns.extractDomain as (v: string) => string | undefined;
const parseJson = fns.parseJson as (v: string) => unknown;
const removeMarkdown = fns.removeMarkdown as (v: string) => string;

describe('Data Transformation Functions', () => {
	describe('String Data Transformation Functions', () => {
		describe('.isEmpty', () => {
			test('should work correctly on a string that is not empty', () => {
				expect(evaluate('={{"NotBlank".isEmpty()}}')).toEqual(false);
			});

			test('should work correctly on a string that is empty', () => {
				expect(evaluate('={{"".isEmpty()}}')).toEqual(true);
			});
		});

		describe('.isNotEmpty', () => {
			test('should work correctly on a string that is not empty', () => {
				expect(evaluate('={{"NotBlank".isNotEmpty()}}')).toEqual(true);
			});

			test('should work correctly on a string that is empty', () => {
				expect(evaluate('={{"".isNotEmpty()}}')).toEqual(false);
			});
		});

		test('.length should return the string length', () => {
			expect(evaluate('={{"String".length()}}')).toEqual(6);
		});

		describe('.hash()', () => {
			test.each([
				['base64', 'MTIzNDU='],
				['md5', '827ccb0eea8a706c4c34a16891f84e7b'],
				['sha1', '8cb2237d0679ca88db6464eac60da96345513964'],
				['sha224', 'a7470858e79c282bc2f6adfd831b132672dfd1224c1e78cbf5bcd057'],
				['sha256', '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5'],
				[
					'sha384',
					'0fa76955abfa9dafd83facca8343a92aa09497f98101086611b0bfa95dbc0dcc661d62e9568a5a032ba81960f3e55d4a',
				],
				[
					'sha512',
					'3627909a29c31381a071ec27f7c9ca97726182aed29a7ddd2e54353322cfb30abb9e3a6df2ac2c20fe23436311d678564d0c8d305930575f60e2d3d048184d79',
				],
				[
					'sha3',
					'0a2a1719bf3ce682afdbedf3b23857818d526efbe7fcb372b31347c26239a0f916c398b7ad8dd0ee76e8e388604d0b0f925d5e913ad2d3165b9b35b3844cd5e6',
				],
			])('should work for %p', (hashFn, hashValue) => {
				expect(evaluate(`={{ "12345".hash("${hashFn}") }}`)).toEqual(hashValue);
				expect(evaluate(`={{ "12345".hash("${hashFn.toLowerCase()}") }}`)).toEqual(hashValue);
			});

			test('should throw on invalid algorithm', () => {
				expect(() => evaluate('={{ "12345".hash("invalid") }}')).toThrow('Unknown algorithm');
			});
		});

		test('.urlDecode should work correctly on a string', () => {
			expect(evaluate('={{ "string%20with%20spaces".urlDecode(false) }}')).toEqual(
				'string with spaces',
			);
		});

		test('.urlEncode should work correctly on a string', () => {
			expect(evaluate('={{ "string with spaces".urlEncode(false) }}')).toEqual(
				'string%20with%20spaces',
			);
		});

		test('.removeTags should work correctly on a string', () => {
			expect(evaluate('={{ "<html><head>test</head></html>".removeTags() }}')).toEqual('test');
		});

		test('.removeMarkdown should work correctly on a string', () => {
			expect(evaluate('={{ "<html><head>test</head></html>".removeMarkdown() }}')).toEqual('test');
		});

		test('.toLowerCase should work correctly on a string', () => {
			expect(evaluate('={{ "TEST".toLowerCase() }}')).toEqual('test');
		});

		describe('.toDate', () => {
			test('should work correctly on a date string', () => {
				expect(evaluate('={{ "2022-09-01T19:42:28.164Z".toDate() }}')).toEqual(
					new Date('2022-09-01T19:42:28.164Z'),
				);
			});

			test('should throw on invalid date', () => {
				expect(() => evaluate('={{ "2022-09-32T19:42:28.164Z".toDate() }}')).toThrow(
					'cannot convert to date',
				);
			});
		});

		test('.toFloat should work correctly on a string', () => {
			expect(evaluate('={{ "1.1".toFloat() }}')).toEqual(1.1);
			expect(evaluate('={{ "1.1".toDecimalNumber() }}')).toEqual(1.1);
		});

		test('.toInt should work correctly on a string', () => {
			expect(evaluate('={{ "1.1".toInt() }}')).toEqual(1);
			expect(evaluate('={{ "1.1".toWholeNumber() }}')).toEqual(1);
			expect(evaluate('={{ "1.5".toInt() }}')).toEqual(1);
			expect(evaluate('={{ "1.5".toWholeNumber() }}')).toEqual(1);
		});

		test('.quote should work correctly on a string', () => {
			expect(evaluate('={{ "test".quote() }}')).toEqual('"test"');
			expect(evaluate('={{ "\\"test\\"".quote() }}')).toEqual('"\\"test\\""');
		});

		test('.isNumeric should work correctly on a string', () => {
			expect(evaluate('={{ "".isNumeric() }}')).toEqual(false);
			expect(evaluate('={{ "asdf".isNumeric() }}')).toEqual(false);
			expect(evaluate('={{ "1234".isNumeric() }}')).toEqual(true);
			expect(evaluate('={{ "4e4".isNumeric() }}')).toEqual(true);
			expect(evaluate('={{ "4.4".isNumeric() }}')).toEqual(true);
		});

		test('.isUrl should work on a string', () => {
			expect(evaluate('={{ "https://example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "http://example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "ftp://example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "example.com".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "www.example.com".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "https://www.example.com/".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com/path".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com/path?query=1".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com/path#fragment".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com:8080".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com?query=1".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "https://example.com#fragment".isUrl() }}')).toEqual(true);
			expect(evaluate('={{ "example.com/path".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "http:///".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "https://".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "example".isUrl() }}')).toEqual(false);
			expect(evaluate('={{ "".isUrl() }}')).toEqual(false);
		});

		test('.isDomain should work on a string', () => {
			expect(evaluate('={{ "example.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "asdf".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "https://example.com/".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "www.example.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "subdomain.example.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "example.co.uk".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "example".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example.".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ ".com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example..com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example_com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example/com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "example com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "www.example..com".isDomain() }}')).toEqual(false);
			expect(evaluate('={{ "123.com".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "xn--80aswg.xn--p1ai".isDomain() }}')).toEqual(true); // Punycode domain
			expect(evaluate('={{ "example.com:8080".isDomain() }}')).toEqual(true);
			expect(evaluate('={{ "".isDomain() }}')).toEqual(false);
		});

		test('.toSnakeCase should work on a string', () => {
			expect(evaluate('={{ "I am a test!".toSnakeCase() }}')).toEqual('i_am_a_test');
			expect(evaluate('={{ "i_am_a_test".toSnakeCase() }}')).toEqual('i_am_a_test');
		});

		test('.toSentenceCase should work on a string', () => {
			expect(
				evaluate(
					'={{ "i am a test! i have multiple types of Punctuation. or do i?".toSentenceCase() }}',
				),
			).toEqual('I am a test! I have multiple types of punctuation. Or do i?');
			expect(evaluate('={{ "i am a test!".toSentenceCase() }}')).toEqual('I am a test!');
			expect(evaluate('={{ "i am a test".toSentenceCase() }}')).toEqual('I am a test');
		});

		test('.toSentenceCase should not drop trailing text that has no letters', () => {
			expect(evaluate('={{ "hello world. 123".toSentenceCase() }}')).toEqual('Hello world. 123');
			expect(evaluate('={{ "end with punc. 42!".toSentenceCase() }}')).toEqual(
				'End with punc. 42!',
			);
			expect(evaluate('={{ "growth is high. 50%".toSentenceCase() }}')).toEqual(
				'Growth is high. 50%',
			);
		});

		test('.toSentenceCase should return letter-free input unchanged', () => {
			expect(evaluate('={{ "42".toSentenceCase() }}')).toEqual('42');
			expect(evaluate('={{ "".toSentenceCase() }}')).toEqual('');
		});

		test('.extractUrl should work on a string', () => {
			expect(
				evaluate(
					'={{ "I am a test with a url: https://example.net/ and I am a test with an email: test@example.org".extractUrl() }}',
				),
			).toEqual('https://example.net/');
			expect(
				evaluate(
					'={{ "Check this out: https://subdomain.example.com:3000/path?q=1#hash".extractUrl() }}',
				),
			).toEqual('https://subdomain.example.com:3000/path?q=1#hash');
			expect(evaluate('={{ "Invalid URL: http:///example.com".extractUrl() }}')).toEqual(undefined);
			expect(
				evaluate(
					'={{ "Mixed content: https://www.example.com and http://www.example.org".extractUrl() }}',
				),
			).toEqual('https://www.example.com');
			expect(
				evaluate('={{ "Text without URL: This is just a simple text".extractUrl() }}'),
			).toEqual(undefined);
			expect(
				evaluate('={{ "URL with Unicode: http://www.xn--80aswg.xn--j1amh".extractUrl() }}'),
			).toEqual('http://www.xn--80aswg.xn--j1amh');
			expect(
				evaluate('={{ "Localhost URL: http://localhost:8080/test?x=1".extractUrl() }}'),
			).toEqual('http://localhost:8080/test?x=1');
			expect(
				evaluate('={{ "IP URL: http://192.168.1.1:8000/path?q=value#frag".extractUrl() }}'),
			).toEqual('http://192.168.1.1:8000/path?q=value#frag');
		});

		test('.extractDomain should work on a string', () => {
			expect(evaluate('={{ "test@example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "https://example.org/".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "https://www.google.com".extractDomain() }}')).toEqual('www.google.com');
			expect(evaluate('={{ "http://example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "ftp://ftp.example.com".extractDomain() }}')).toEqual('ftp.example.com');
			expect(evaluate('={{ "google.com".extractDomain() }}')).toEqual('google.com');
			expect(evaluate('={{ "www.example.net".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "//example.com".extractDomain() }}')).toEqual('example.com');
			expect(evaluate('={{ "mailto:john.doe@example.com".extractDomain() }}')).toEqual(
				'example.com',
			);
			expect(evaluate('={{ "tel:+1-555-123-4567".extractDomain() }}')).toEqual(undefined);
			expect(evaluate('={{ "jane.doe@example.org".extractDomain() }}')).toEqual('example.org');
			expect(evaluate('={{ "name+tag@example.com".extractDomain() }}')).toEqual('example.com');
			expect(evaluate('={{ "first.last@example.co.uk".extractDomain() }}')).toEqual(
				'example.co.uk',
			);
			expect(evaluate('={{ "user@subdomain.example.com".extractDomain() }}')).toEqual(
				'subdomain.example.com',
			);
			expect(evaluate('={{ "www.example.net?test=1213".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "www.example.net?test".extractDomain() }}')).toEqual('www.example.net');
			expect(evaluate('={{ "www.example.net#tesdt123".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://www.example.net?test=1213".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://www.example.net?test".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://www.example.net#tesdt123".extractDomain() }}')).toEqual(
				'www.example.net',
			);
			expect(evaluate('={{ "https://192.168.1.1".extractDomain() }}')).toEqual('192.168.1.1');
			expect(evaluate('={{ "http://www.xn--80aswg.xn--j1amh".extractDomain() }}')).toEqual(
				'www.xn--80aswg.xn--j1amh',
			);
			expect(evaluate('={{ "https://localhost".extractDomain() }}')).toEqual('localhost');
			expect(evaluate('={{ "https://localhost?test=123".extractDomain() }}')).toEqual('localhost');
			expect(evaluate('={{ "https://www.example_with_underscore.com".extractDomain() }}')).toEqual(
				'www.example_with_underscore.com',
			);
			expect(evaluate('={{ "https://www.example.com:8080".extractDomain() }}')).toEqual(
				'www.example.com',
			);
			expect(evaluate('={{ "https://example.space".extractDomain() }}')).toEqual('example.space');
		});

		test('.extractEmail should work on a string', () => {
			expect(
				evaluate(
					'={{ "I am a test with a url: https://example.net/ and I am a test with an email: test@example.org".extractEmail() }}',
				),
			).toEqual('test@example.org');
		});

		test('.isEmail should work on a string', () => {
			expect(evaluate('={{ "test@example.com".isEmail() }}')).toEqual(true);
			expect(evaluate('={{ "aaaaaaaa".isEmail() }}')).toEqual(false);
			expect(evaluate('={{ "test @ n8n".isEmail() }}')).toEqual(false);
		});

		test('.toDateTime should work on a variety of formats', () => {
			expect(
				asDateTime(evaluate('={{ "Wed, 21 Oct 2015 07:28:00 GMT".toDateTime() }}')),
			).toBeInstanceOf(DateTime);
			expect(asDateTime(evaluate('={{ "2008-11-11".toDateTime() }}'))).toBeInstanceOf(DateTime);
			expect(asDateTime(evaluate('={{ "1-Feb-2024".toDateTime() }}'))).toBeInstanceOf(DateTime);
			expect(asDateTime(evaluate('={{ "1713976144063".toDateTime("ms") }}'))).toBeInstanceOf(
				DateTime,
			);
			expect(asDateTime(evaluate('={{ "31-01-2024".toDateTime("dd-MM-yyyy") }}'))).toBeInstanceOf(
				DateTime,
			);

			vi.useFakeTimers({ now: new Date() });
			expect(() => evaluate('={{ "hi".toDateTime() }}')).toThrow(ExpressionExtensionError);
			expect(() => evaluate('={{ "hi".toDateTime() }}')).toThrow(
				'cannot convert to Luxon DateTime',
			);
			vi.useRealTimers();
		});

		test('.extractUrlPath should work on a string', () => {
			expect(
				evaluate('={{ "https://example.com/orders/1/detail#hash?foo=bar".extractUrlPath() }}'),
			).toEqual('/orders/1/detail');
			expect(evaluate('={{ "hi".extractUrlPath() }}')).toBeUndefined();
		});

		test('.parseJson should work on a string', () => {
			expect(evaluate('={{ \'{"test1":1,"test2":"2"}\'.parseJson() }}')).toEqual({
				test1: 1,
				test2: '2',
			});
		});

		test('.parseJson should throw on invalid JSON', () => {
			expect(() => evaluate("={{ \"{'test1':1,'test2':'2'}\".parseJson() }}")).toThrowError(
				"Parsing failed. Check you're using double quotes",
			);
			expect(() => evaluate('={{ "No JSON here".parseJson() }}')).toThrowError('Parsing failed');
		});

		test('.toJsonString should work on a string', () => {
			expect(evaluate('={{ "test".toJsonString() }}')).toEqual(JSON.stringify('test'));
			expect(evaluate('={{ "The \\"best\\" colours: red\\nbrown".toJsonString() }}')).toEqual(
				JSON.stringify('The "best" colours: red\nbrown'),
			);
			expect(evaluate('={{ "".toJsonString() }}')).toEqual(JSON.stringify(''));
		});

		test('.toBoolean should work on a string', () => {
			expect(evaluate('={{ "False".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "0".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "no".toBoolean() }}')).toBe(false);
			expect(evaluate('={{ "TRUE".toBoolean() }}')).toBe(true);
			expect(evaluate('={{ "hello".toBoolean() }}')).toBe(true);
		});

		test('.base64Encode should work on a string', () => {
			expect(evaluate('={{ "n8n test".base64Encode() }}')).toBe('bjhuIHRlc3Q=');
		});

		test('.base64Decode should work on a string', () => {
			expect(evaluate('={{ "bjhuIHRlc3Q=".base64Decode() }}')).toBe('n8n test');
		});

		describe('strengthened behaviours', () => {
			describe('.hash', () => {
				test('should default to md5 when no algorithm is given', () => {
					// pins the `?? 'md5'` default and the optional-chaining on the missing arg
					expect(evaluate('={{ "hello".hash() }}')).toEqual(evaluate('={{ "hello".hash("md5") }}'));
					expect(evaluate('={{ "hello".hash() }}')).toEqual('5d41402abc4b2a76b9719d911017c592');
				});

				test('should base64-encode when algorithm is base64', () => {
					expect(evaluate('={{ "hello".hash("base64") }}')).toEqual('aGVsbG8=');
				});
			});

			describe('.toDateTime', () => {
				// Each numeric format interprets the timestamp on a different scale; if the
				// matching branch is skipped it falls through to DateTime.fromFormat and
				// produces an invalid DateTime (NaN year), so asserting the year pins the branch.
				test('should interpret the "s" (seconds) format', () => {
					expect(asDateTime(evaluate('={{ "1708695471".toDateTime("s") }}')).year).toEqual(2024);
				});

				test('should interpret the "ms" (milliseconds) format', () => {
					expect(asDateTime(evaluate('={{ "1708695471000".toDateTime("ms") }}')).year).toEqual(
						2024,
					);
				});

				test('should interpret the "us" (microseconds) format', () => {
					expect(asDateTime(evaluate('={{ "1708695471000000".toDateTime("us") }}')).year).toEqual(
						2024,
					);
				});

				test('should interpret the "excel" (days since 1900) format', () => {
					expect(asDateTime(evaluate('={{ "45345".toDateTime("excel") }}')).year).toEqual(2024);
				});

				test('the numeric formats are not interchangeable', () => {
					// the same number lands in different years depending on the scale
					expect(asDateTime(evaluate('={{ "1000000000".toDateTime("s") }}')).year).toEqual(2001);
					expect(asDateTime(evaluate('={{ "1000000000".toDateTime("ms") }}')).year).toEqual(1970);
				});
			});

			describe('.urlEncode / .urlDecode', () => {
				// The `allChars` flag toggles encodeURI/decodeURI (URI-syntax chars preserved)
				// vs encodeURIComponent/decodeURIComponent (everything encoded). Pinning a
				// reserved char like `=` distinguishes the two branches.
				test('urlEncode(false) encodes reserved characters', () => {
					expect(evaluate('={{ "name=Nathan Automat".urlEncode(false) }}')).toEqual(
						'name%3DNathan%20Automat',
					);
				});

				test('urlEncode(true) preserves reserved characters', () => {
					expect(evaluate('={{ "name=Nathan Automat".urlEncode(true) }}')).toEqual(
						'name=Nathan%20Automat',
					);
				});

				test('urlEncode defaults to encoding reserved characters', () => {
					expect(evaluate('={{ "name=Nathan Automat".urlEncode() }}')).toEqual(
						'name%3DNathan%20Automat',
					);
				});

				test('urlDecode(false) decodes reserved characters', () => {
					expect(evaluate('={{ "name%3DNathan%20Automat".urlDecode(false) }}')).toEqual(
						'name=Nathan Automat',
					);
				});

				test('urlDecode(true) preserves reserved escape sequences', () => {
					expect(evaluate('={{ "name%3DNathan%20Automat".urlDecode(true) }}')).toEqual(
						'name%3DNathan Automat',
					);
				});

				test('urlDecode defaults to decoding reserved characters', () => {
					expect(evaluate('={{ "name%3DNathan%20Automat".urlDecode() }}')).toEqual(
						'name=Nathan Automat',
					);
				});
			});

			describe('.toInt', () => {
				test('should strip currency symbols before parsing', () => {
					expect(evaluate('={{ "$5".toInt() }}')).toEqual(5);
				});

				test('should throw when the value is not an integer', () => {
					expect(() => evaluate('={{ "abc".toInt() }}')).toThrow('cannot convert to integer');
				});
			});

			describe('.toFloat', () => {
				test('should strip currency symbols before parsing', () => {
					expect(evaluate('={{ "$1.5".toFloat() }}')).toEqual(1.5);
				});

				test('should reject a comma decimal separator', () => {
					expect(() => evaluate('={{ "1,5".toFloat() }}')).toThrow(
						'cannot convert to float, expected . as decimal separator',
					);
				});

				test('should throw when the value is not a number', () => {
					expect(() => evaluate('={{ "abc".toFloat() }}')).toThrow('cannot convert to float');
				});
			});

			describe('.toNumber', () => {
				test('should convert a numeric string', () => {
					expect(evaluate('={{ "42".toNumber() }}')).toEqual(42);
					expect(evaluate('={{ "1.23E10".toNumber() }}')).toEqual(12300000000);
				});

				test('should strip currency symbols before parsing', () => {
					expect(evaluate('={{ "$42".toNumber() }}')).toEqual(42);
				});

				test('should throw when the value is not a number', () => {
					expect(() => evaluate('={{ "abc".toNumber() }}')).toThrow('cannot convert to number');
				});
			});

			describe('.quote', () => {
				test('should escape backslashes in the input', () => {
					expect(evaluate('={{ "a\\\\b".quote() }}')).toEqual('"a\\\\b"');
				});

				test('should support a custom quote character', () => {
					expect(evaluate('={{ "test".quote("\'") }}')).toEqual("'test'");
				});
			});

			describe('.isNumeric', () => {
				test('should reject values containing whitespace even if otherwise numeric', () => {
					// Number(' 5 ') is 5, so without the space guard this would be true
					expect(evaluate('={{ " 5 ".isNumeric() }}')).toEqual(false);
				});
			});

			describe('.isEmail', () => {
				test('should reject an otherwise-valid email embedded in a longer string', () => {
					// regex matches the substring; the manual space guard rejects it
					expect(evaluate('={{ "valid@example.com extra".isEmail() }}')).toEqual(false);
				});
			});

			describe('.replaceSpecialChars', () => {
				test('should transliterate accented characters to ASCII', () => {
					expect(evaluate('={{ "déjà".replaceSpecialChars() }}')).toEqual('deja');
				});

				test('should replace untransliterable characters with a question mark', () => {
					// pins the { unknown: '?' } option — without it the emoji is dropped
					expect(evaluate('={{ "a🎉b".replaceSpecialChars() }}')).toEqual('a?b');
				});
			});

			describe('.extractEmail', () => {
				test('should return undefined when no email is present', () => {
					expect(evaluate('={{ "no email here".extractEmail() }}')).toBeUndefined();
				});
			});

			describe('.extractUrl', () => {
				test('should return undefined when no URL is present', () => {
					expect(evaluate('={{ "no url here".extractUrl() }}')).toBeUndefined();
				});
			});

			describe('.removeMarkdown', () => {
				test.each([
					['*bold*, [link]()', 'bold, link'],
					['# Heading', 'Heading'],
					['**strong** and _em_', 'strong and em'],
					['~~strike~~', 'strike'],
					['> quote', ' quote'],
					['![alt](img.png)', ''],
					['[text](http://x.com)', 'text'],
					['- item', 'item'],
					['1. item', 'item'],
					['`code`', 'code'],
					['text with footnote[^1]', 'text with footnote'],
				])('should strip markdown from %p', (input, expected) => {
					expect(evaluate(`={{ "${input}".removeMarkdown() }}`)).toEqual(expected);
				});
			});

			describe('.toTitleCase', () => {
				test('should capitalize words but leave short prepositions lowercase', () => {
					expect(evaluate('={{ "quick a brown FOX".toTitleCase() }}')).toEqual('Quick a Brown FOX');
				});
			});

			// Asserted by calling the source directly — see the note on `fns` above.
			describe('direct function contracts', () => {
				describe('.extractEmail', () => {
					test('returns the email when present', () => {
						expect(extractEmail('say hi to me@example.com please')).toEqual('me@example.com');
					});

					test('returns undefined when no email is present', () => {
						expect(extractEmail('no email here')).toBeUndefined();
					});
				});

				describe('.extractUrl', () => {
					test('returns the url when present', () => {
						expect(extractUrl('go to http://n8n.io now')).toEqual('http://n8n.io');
					});

					test('returns undefined when no url is present', () => {
						expect(extractUrl('no url here')).toBeUndefined();
					});
				});

				describe('.extractDomain', () => {
					test('extracts the domain from an email', () => {
						expect(extractDomain('me@example.com')).toEqual('example.com');
					});

					test('extracts the domain from a url', () => {
						expect(extractDomain('http://n8n.io/workflows')).toEqual('n8n.io');
					});

					test('returns undefined when neither email nor domain is present', () => {
						expect(extractDomain('tel:+1-555-123-4567')).toBeUndefined();
					});
				});

				// Multiline markdown cases — easier to express as direct calls than through
				// the expression string harness (no newline escaping).
				describe('.removeMarkdown (multiline)', () => {
					test.each([
						['setext header underline is removed', 'Title\n===\nbody', 'Title\n\nbody'],
						['runs of blank lines collapse to one', 'para1\n\n\n\npara2', 'para1\n\npara2'],
						['atx header markers are stripped', '## Heading ##', 'Heading '],
						['blockquote markers are stripped', 'a > b > c', 'a  b  c'],
						['triple emphasis is unwrapped', '___bold___', 'bold'],
					])('%s', (_name, input, expected) => {
						expect(removeMarkdown(input)).toEqual(expected);
					});
				});

				describe('.parseJson', () => {
					test('parses valid JSON', () => {
						expect(parseJson('{"a":1}')).toEqual({ a: 1 });
					});

					test('throws a quote-specific message for single-quoted JSON', () => {
						expect(() => parseJson("{'a':1}")).toThrow("Check you're using double quotes");
					});

					test('throws a generic message for other invalid JSON', () => {
						// anchored so the quote-specific message ("Parsing failed. Check ...") does not match
						expect(() => parseJson('not json at all')).toThrow(/Parsing failed$/);
					});
				});
			});
		});
	});
});
