import fc from 'fast-check';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, INodeParameterResourceLocator } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	blockUrlExtractionRegexp,
	blockUrlValidationRegexp,
	databasePageUrlExtractionRegexp,
	databasePageUrlValidationRegexp,
	databaseUrlExtractionRegexp,
	databaseUrlValidationRegexp,
} from '../shared/constants';
import { NotionTrigger } from '../NotionTrigger.node';
import {
	extractDatabaseMentionRLC,
	extractPageId,
	formatBlocks,
	getPageId,
	notionApiRequest,
	notionApiRequestAllItems,
	simplifyObjects,
} from '../shared/GenericFunctions';
import { versionDescription as versionDescriptionV1 } from '../v1/VersionDescription';
import { versionDescription as versionDescriptionV2 } from '../v2/VersionDescription';
import { asciiWord, hardString, isAscii, lookAlikePair } from '@test/hard-strings';
import { describeKeyDerivation } from '@test/hard-strings/key-derivation';
import type { Mock } from 'vitest';

const collectNotionUrlExpressions = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.flatMap(collectNotionUrlExpressions);
	}

	if (value && typeof value === 'object') {
		return Object.entries(value).flatMap(([key, nestedValue]) => {
			if (
				key === 'url' &&
				typeof nestedValue === 'string' &&
				nestedValue.startsWith('=https://www.notion.')
			) {
				return [nestedValue];
			}

			return collectNotionUrlExpressions(nestedValue);
		});
	}

	return [];
};

describe('Test NotionV2, formatBlocks', () => {
	it('should format to_do block', () => {
		const blocks = [
			{
				type: 'to_do',
				checked: false,
				richText: false,
				textContent: 'Testing',
			},
		];

		const result = formatBlocks(blocks);

		expect(result).toEqual([
			{
				object: 'block',
				type: 'to_do',
				to_do: {
					checked: false,
					text: [
						{
							text: {
								content: 'Testing',
							},
						},
					],
				},
			},
		]);
	});
});

describe('Test Notion', () => {
	const testIds = [
		'4eb10d5001254b7faaa831d72d9445aa', // Taken from Notion
		'fffb95d3060b80309027eb9c99605ec3', // Taken from user comment
		'a6356387779d4df485449a72a408f0d4', // Random v4 UUID
		'f4c1217e48f711ef94540242ac120002', // Random v1 UUID
	];

	describe('extractPageId From URL', () => {
		// RLC does some Regex extraction before extractPageId is called
		const extractIdFromUrl = (url: string): string => {
			const match = url.match(databasePageUrlExtractionRegexp);
			return match ? match[1] : url;
		};

		test.each([
			['www.notion.so', 'https://www.notion.so/fake-instance'],
			['www.notion.com', 'https://www.notion.com/fake-instance'],
		])('should return the part after "p=" on %s', (_, baseUrl) => {
			for (const testId of testIds) {
				const page = `${baseUrl}?p=${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test.each([
			['www.notion.so', 'https://www.notion.so/fake-instance'],
			['www.notion.com', 'https://www.notion.com/fake-instance'],
		])(
			'should return the last part after splitting by "-" when URL contains multiple "-" on %s',
			(_, baseUrl) => {
				for (const testId of testIds) {
					const page = `${baseUrl}/some-page-${testId}`;
					const result = extractPageId(extractIdFromUrl(page));
					expect(result).toBe(testId);
				}
			},
		);

		test.each([
			['www.notion.so', 'https://www.notion.so/fake-instance'],
			['www.notion.com', 'https://www.notion.com/fake-instance'],
		])(
			'should return the last part after splitting by "-" when URL contains one "-" on %s',
			(_, baseUrl) => {
				for (const testId of testIds) {
					const page = `${baseUrl}/1-${testId}`;
					const result = extractPageId(extractIdFromUrl(page));
					expect(result).toBe(testId);
				}
			},
		);

		test.each([
			['www.notion.so', 'https://www.notion.so/fake-instance'],
			['www.notion.com', 'https://www.notion.com/fake-instance'],
		])('should return just the id when there is an instance name on %s', (_, baseUrl) => {
			for (const testId of testIds) {
				const page = `${baseUrl}/${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test.each([
			['www.notion.so', 'https://www.notion.so'],
			['www.notion.com', 'https://www.notion.com'],
		])('should return the id when there is no instance name on %s', (_, host) => {
			for (const testId of testIds) {
				const page = `${host}/${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test.each([
			['www.notion.so', 'https://www.notion.so'],
			['www.notion.com', 'https://www.notion.com'],
		])('should return the id when page slug contains underscores on %s', (_, host) => {
			for (const testId of testIds) {
				const page = `${host}/url_with-underscore-${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test('should extract page ID from new app.notion.com/p/ URL format', () => {
			for (const testId of testIds) {
				const page = `https://app.notion.com/p/Handbook-${testId}?source=copy_link`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});

		test('should extract page ID from new app.notion.com/p/ URL without query string', () => {
			for (const testId of testIds) {
				const page = `https://app.notion.com/p/My-Page-Title-${testId}`;
				const result = extractPageId(extractIdFromUrl(page));
				expect(result).toBe(testId);
			}
		});
	});
});

describe('Test Notion resource locator URL regexes', () => {
	const id = '3ab5bc794647496dac48feca926813fd';

	it.each([
		[
			'database URL',
			'www.notion.so',
			databaseUrlValidationRegexp,
			databaseUrlExtractionRegexp,
			`https://www.notion.so/${id}?v=7bcc03614eed4c95a9e6168c040e9c58`,
		],
		[
			'database URL',
			'www.notion.com',
			databaseUrlValidationRegexp,
			databaseUrlExtractionRegexp,
			`https://www.notion.com/${id}?v=7bcc03614eed4c95a9e6168c040e9c58`,
		],
		[
			'database page URL',
			'www.notion.so',
			databasePageUrlValidationRegexp,
			databasePageUrlExtractionRegexp,
			`https://www.notion.so/Page-Title-${id}`,
		],
		[
			'database page URL',
			'www.notion.com',
			databasePageUrlValidationRegexp,
			databasePageUrlExtractionRegexp,
			`https://www.notion.com/Page-Title-${id}`,
		],
		[
			'block URL',
			'www.notion.so',
			blockUrlValidationRegexp,
			blockUrlExtractionRegexp,
			`https://www.notion.so/Block-Test-${id}?pvs=4#c44444444444bbbbb4d32fdfdd84e`,
		],
		[
			'block URL',
			'www.notion.com',
			blockUrlValidationRegexp,
			blockUrlExtractionRegexp,
			`https://www.notion.com/Block-Test-${id}?pvs=4#c44444444444bbbbb4d32fdfdd84e`,
		],
	])(
		'should validate and extract IDs from %s on %s',
		(_, __, validationRegexp, extractionRegexp, url) => {
			expect(url).toMatch(new RegExp(validationRegexp));
			expect(url.match(new RegExp(extractionRegexp))?.[1]).toBe(id);
		},
	);
});

describe('Test Notion resource locator generated URLs', () => {
	const descriptions = [
		new NotionTrigger().description,
		versionDescriptionV1,
		versionDescriptionV2,
	];

	it('should generate notion.com URL expressions across all node descriptions', () => {
		const notionUrlExpression = '=https://www.notion.com/{{$value.replace(/-/g, "")}}';
		const urlExpressions = collectNotionUrlExpressions(descriptions);

		expect(urlExpressions).not.toHaveLength(0);
		expect(urlExpressions.every((url) => url === notionUrlExpression)).toBe(true);
		expect(urlExpressions).not.toContain('=https://www.notion.so/{{$value.replace(/-/g, "")}}');
		expect(urlExpressions).not.toContain(
			'=https://www.notion.(?:so|com)/{{$value.replace(/-/g, "")}}',
		);
	});
});

describe('Test Notion, extractDatabaseMentionRLC', () => {
	it('extracts database IDs with resource-locator regex metadata', () => {
		const blockValues: Array<{
			richText: boolean;
			text: {
				text: Array<{
					textType: string;
					mentionType: string;
					database: string | { __rl: boolean; mode: string; value: string; __regex: string };
				}>;
			};
		}> = [
			{
				richText: true,
				text: {
					text: [
						{
							textType: 'mention',
							mentionType: 'database',
							database: {
								__rl: true,
								mode: 'url',
								value: 'https://www.notion.com/workspace/database-3ab5bc794647496dac48feca926813fd',
								__regex: '([0-9a-f]{32})$',
							},
						},
					],
				},
			},
		];

		extractDatabaseMentionRLC(blockValues);

		expect(blockValues[0].text.text[0].database).toBe('3ab5bc794647496dac48feca926813fd');
	});
});

describe('Test Notion, getPageId', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	const id = '3ab5bc794647496dac48feca926813fd';

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return page ID directly when mode is id', () => {
		const page = {
			mode: 'id',
			value: id,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);

		const result = getPageId.call(mockExecuteFunctions, 0);
		expect(result).toBe(id);
		expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('pageId', 0, {});
	});

	it.each([
		['www.notion.so', `https://www.notion.so/xxxxx?v=xxxxx&p=${id}&pm=s`],
		['www.notion.com', `https://www.notion.com/xxxxx?v=xxxxx&p=${id}&pm=s`],
	])('should extract page ID from URL with p parameter on %s', (_, value) => {
		const page = {
			mode: 'url',
			value,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);

		const result = getPageId.call(mockExecuteFunctions, 0);
		expect(result).toBe(id);
	});

	it.each([
		['www.notion.so', `https://www.notion.so/page-name-${id}`],
		['www.notion.com', `https://www.notion.com/page-name-${id}`],
	])('should extract page ID from URL using regex on %s', (_, value) => {
		const page = {
			mode: 'url',
			value,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);

		const result = getPageId.call(mockExecuteFunctions, 0);
		expect(result).toBe(id);
	});

	it('should extract page ID from new app.notion.com/p/ URL', () => {
		const page = {
			mode: 'url',
			value: `https://app.notion.com/p/Handbook-${id}?source=copy_link`,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);

		const result = getPageId.call(mockExecuteFunctions, 0);
		expect(result).toBe(id);
	});

	it('should throw error when page ID cannot be extracted', () => {
		const page = {
			mode: 'url',
			value: 'https://www.notion.so/invalid-url',
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: https://www.notion.so/invalid-url',
		);
	});

	it('should throw error when page value is empty', () => {
		const page = {
			mode: 'url',
			value: '',
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: ',
		);
	});

	it('should throw error when page value is undefined', () => {
		const page = {
			mode: 'url',
			value: undefined,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: undefined',
		);
	});

	it('should throw error when page value is not a string', () => {
		const page = {
			mode: 'url',
			value: 123 as any,
		} as INodeParameterResourceLocator;

		mockExecuteFunctions.getNodeParameter.mockReturnValue(page);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: 'Notion', type: 'notion' }));

		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(NodeOperationError);
		expect(() => getPageId.call(mockExecuteFunctions, 0)).toThrow(
			'Could not extract page ID from URL: 123',
		);
	});
});

describe('Test Notion, notionApiRequest', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		mockExecuteFunctions.helpers = {
			requestWithAuthentication: vi.fn().mockResolvedValue({}),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should use notionApi credential when authentication is apiKey', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('apiKey');

		await notionApiRequest.call(mockExecuteFunctions, 'GET', '/users');

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'notionApi',
			expect.objectContaining({ method: 'GET', uri: 'https://api.notion.com/v1/users' }),
		);
	});

	it('should use notionOAuth2Api credential when authentication is oAuth2', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2');

		await notionApiRequest.call(mockExecuteFunctions, 'GET', '/users');

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'notionOAuth2Api',
			expect.objectContaining({ method: 'GET', uri: 'https://api.notion.com/v1/users' }),
		);
	});

	it('should default to notionApi credential when authentication parameter is not set', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

		await notionApiRequest.call(mockExecuteFunctions, 'GET', '/users');

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'notionApi',
			expect.objectContaining({ method: 'GET' }),
		);
	});
});

describe('Test Notion, notionApiRequestAllItems', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		mockExecuteFunctions.helpers = {
			requestWithAuthentication: vi.fn(),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should extract limit from query, remove it, and stop pagination early', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'resource') return 'block';
			if (name === 'authentication') return 'apiKey';
			return undefined;
		});

		const page1 = {
			results: [{ id: '1' }, { id: '2' }],
			has_more: true,
			next_cursor: 'cursor-2',
		};
		const page2 = {
			results: [{ id: '3' }, { id: '4' }],
			has_more: false,
		};

		(mockExecuteFunctions.helpers.requestWithAuthentication as Mock)
			.mockResolvedValueOnce(page1)
			.mockResolvedValueOnce(page2);

		const query = { page_size: 2, limit: 3 };
		const result = await notionApiRequestAllItems.call(
			mockExecuteFunctions,
			'results',
			'GET',
			'/blocks/test-block/children',
			{},
			query,
		);

		expect(query).not.toHaveProperty('limit');
		expect(result).toHaveLength(3);
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('should paginate through all pages for non-block resources', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'resource') return 'database';
			if (name === 'authentication') return 'apiKey';
			return undefined;
		});

		const page1 = {
			results: [{ id: '1' }],
			has_more: true,
			next_cursor: 'cursor-2',
		};
		const page2 = {
			results: [{ id: '2' }],
			has_more: false,
			next_cursor: null,
		};

		(mockExecuteFunctions.helpers.requestWithAuthentication as Mock)
			.mockResolvedValueOnce(page1)
			.mockResolvedValueOnce(page2);

		const result = await notionApiRequestAllItems.call(
			mockExecuteFunctions,
			'results',
			'POST',
			'/search',
			{},
			{ limit: 5 },
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('should return all items without slicing when no limit is provided', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'resource') return 'database';
			if (name === 'authentication') return 'apiKey';
			return undefined;
		});

		const page1 = {
			results: [{ id: '1' }, { id: '2' }],
			has_more: false,
			next_cursor: null,
		};

		(mockExecuteFunctions.helpers.requestWithAuthentication as Mock).mockResolvedValueOnce(page1);

		const result = await notionApiRequestAllItems.call(
			mockExecuteFunctions,
			'results',
			'POST',
			'/search',
			{},
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }]);
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
	});
});

describe('Test Notion, simplifyObjects', () => {
	const richText = (text: string) => ({
		type: 'rich_text',
		rich_text: [{ type: 'text', plain_text: text }],
	});

	const page = (properties: Record<string, unknown>) => ({
		object: 'page',
		id: 'page-id',
		url: 'https://www.notion.so/page-id',
		properties: {
			Name: { type: 'title', title: [{ type: 'text', plain_text: 'Roadmap' }] },
			...properties,
		},
	});

	/**
	 * The simplified key that a property with this name gets. Found by value, so a name
	 * whose key collides with the title key still reports the key it landed on.
	 * `undefined` when the property is missing from the output.
	 */
	const keyFor = (propertyName: string, version: number): string | undefined => {
		const [result] = simplifyObjects([page({ [propertyName]: richText('x') })], false, version);
		return Object.keys(result).find((key) => result[key] === 'x');
	};

	it('prefixes simplified property keys and keeps the title', () => {
		const result = simplifyObjects([page({ 'First Name': richText('Jean') })], false, 2);

		expect(result[0]).toEqual({
			id: 'page-id',
			name: 'Roadmap',
			url: 'https://www.notion.so/page-id',
			property_name: 'Roadmap',
			property_first_name: 'Jean',
		});
	});

	describe('v3 keeps change-case v5 Unicode-aware keys', () => {
		describeKeyDerivation('property keys', (name) => keyFor(name, 3), {
			keyPattern: /^property_[\p{L}\p{M}\d_]*$/u,
		});

		it('keeps a lowercase word of any script as the key', () => {
			const lowercaseWord = hardString('latin-accented', 'greek', 'cyrillic', 'cjk')
				.map((name) => name.toLowerCase())
				.filter((name) => /^\p{Ll}+$/u.test(name));

			fc.assert(
				fc.property(lowercaseWord, (name) => {
					expect(keyFor(name, 3)).toBe(`property_${name}`);
				}),
				{ examples: [['prénom'], ['straße'], ['κόσμος'], ['имя']] },
			);
		});

		// A look-alike letter survives into the key, so `$json.property_nаme` with a Cyrillic а
		// is a different key from `$json.property_name` while looking identical. The one way
		// two names merge is case mapping, e.g. the Kelvin sign K lowercases to an ASCII k.
		it('keeps a look-alike distinct from its ASCII twin unless case mapping merges them', () => {
			fc.assert(
				fc.property(lookAlikePair, ([word, lookAlike]) => {
					const merged = lookAlike.toLowerCase() === word.toLowerCase();
					expect(keyFor(lookAlike, 3) === keyFor(word, 3)).toBe(merged);
				}),
			);
		});
	});

	describe('earlier versions fold to the pre-v5 ASCII shape', () => {
		describeKeyDerivation('property keys', (name) => keyFor(name, 2), {
			keyPattern: /^property_[a-z0-9_]*$/,
		});

		// change-case v4 saw every non-ASCII code point as a separator, decomposed accents
		// included: `Pre` + combining acute + `nom` gives `pre_nom`, not `pr_nom`.
		it('treats every non-ASCII character as a word separator', () => {
			const nonAsciiCharacter = fc
				.string({ unit: 'grapheme-composite', minLength: 1, maxLength: 1 })
				.filter((character) => !isAscii(character));
			const wordsWithSeparators = fc
				.array(fc.tuple(asciiWord, nonAsciiCharacter), { minLength: 1, maxLength: 4 })
				.map((parts) => ({
					name: parts.map(([word, separator]) => word + separator).join(''),
					expectedKey: `property_${parts.map(([word]) => word.toLowerCase()).join('_')}`,
				}));

			fc.assert(
				fc.property(wordsWithSeparators, ({ name, expectedKey }) => {
					expect(keyFor(name, 2)).toBe(expectedKey);
				}),
				{
					examples: [
						[{ name: 'Prénom', expectedKey: 'property_pr_nom' }],
						[{ name: 'Prénom'.normalize('NFD'), expectedKey: 'property_pre_nom' }],
						[{ name: 'Prix (€)', expectedKey: 'property_prix' }],
					],
				},
			);
		});

		// Every character of a non-Latin script folds away, so all such names share one key
		// and only the last property survives. v3 keeps one key per property.
		it('gives every name of a non-Latin script the empty key', () => {
			fc.assert(
				fc.property(hardString('greek', 'cyrillic', 'cjk'), (name) => {
					expect(keyFor(name, 2)).toBe('property_');
				}),
			);
		});

		it('agrees with v3 on ASCII names', () => {
			const asciiName = hardString('unsafe-keys', 'reserved-words', 'expression-hostile').filter(
				isAscii,
			);

			fc.assert(
				fc.property(asciiName, (name) => {
					expect(keyFor(name, 2)).toBe(keyFor(name, 3));
				}),
			);
		});
	});
});
