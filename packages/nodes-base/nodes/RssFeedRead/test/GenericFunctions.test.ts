import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import Parser from 'rss-parser';

import { feedFetchFailedTransiently, parseFeedUrl } from '../GenericFunctions';
import type { Mock } from 'vitest';

vi.mock('rss-parser');

const ParserMock = Parser as unknown as Mock;

const RELAXED_ACCEPT =
	'application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4';

describe('parseFeedUrl', () => {
	const feedUrl = 'https://example.com/feed';
	const xmlBody = '<rss />';
	const parsed = { items: [{ title: 'item-1' }] };

	let helpers: ReturnType<typeof mock<IExecuteFunctions['helpers']>>;

	beforeEach(() => {
		vi.clearAllMocks();

		helpers = mock<IExecuteFunctions['helpers']>();
		helpers.httpRequest.mockResolvedValue(xmlBody);

		(Parser.prototype.parseString as Mock).mockResolvedValue(parsed);
	});

	it('uses GET with default headers, text encoding, and no SSL skip when no options are passed', async () => {
		const result = await parseFeedUrl(helpers, feedUrl);

		expect(result).toBe(parsed);

		expect(helpers.httpRequest).toHaveBeenCalledTimes(1);
		expect(helpers.httpRequest).toHaveBeenCalledWith({
			method: 'GET',
			url: feedUrl,
			headers: {
				'User-Agent': 'rss-parser',
				Accept: 'application/rss+xml',
			},
			json: false,
			encoding: 'text',
			skipSslCertificateValidation: undefined,
		});

		expect(Parser.prototype.parseString).toHaveBeenCalledWith(xmlBody);
	});

	it('switches to the relaxed Accept header when useRelaxedAcceptHeader is true', async () => {
		await parseFeedUrl(helpers, feedUrl, { useRelaxedAcceptHeader: true });

		expect(helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({ Accept: RELAXED_ACCEPT }),
			}),
		);
	});

	it('passes skipSslCertificateValidation when ignoreSSL is true', async () => {
		await parseFeedUrl(helpers, feedUrl, { ignoreSSL: true });

		expect(helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ skipSslCertificateValidation: true }),
		);
	});

	it('splits and trims customFields before passing them to the parser', async () => {
		await parseFeedUrl(helpers, feedUrl, { customFields: 'custom, dc:creator , media:content' });

		expect(ParserMock).toHaveBeenCalledWith(
			expect.objectContaining({
				customFields: { item: ['custom', 'dc:creator', 'media:content'] },
			}),
		);
	});

	it('does not set a customFields parser option when none are provided', async () => {
		await parseFeedUrl(helpers, feedUrl);

		const parserOptions = ParserMock.mock.calls.at(-1)?.[0] ?? {};
		expect(parserOptions).not.toHaveProperty('customFields');
	});

	it('always sets the sanitizing xml2js processors on the parser', async () => {
		await parseFeedUrl(helpers, feedUrl);

		const parserOptions = ParserMock.mock.calls.at(-1)?.[0];
		expect(parserOptions?.xml2js?.tagNameProcessors).toHaveLength(1);
		expect(parserOptions?.xml2js?.attrNameProcessors).toHaveLength(1);
	});

	it('coerces a non-string response body to a string before parsing', async () => {
		helpers.httpRequest.mockResolvedValue(Buffer.from('<rss>buf</rss>') as unknown as string);

		await parseFeedUrl(helpers, feedUrl);

		expect(Parser.prototype.parseString).toHaveBeenCalledWith(
			expect.stringContaining('<rss>buf</rss>'),
		);
	});

	it('propagates errors thrown by the underlying httpRequest helper', async () => {
		const networkError = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
		helpers.httpRequest.mockRejectedValue(networkError);

		await expect(parseFeedUrl(helpers, feedUrl)).rejects.toBe(networkError);
		expect(Parser.prototype.parseString).not.toHaveBeenCalled();
	});

	it('propagates errors thrown by the parser', async () => {
		const parseError = new Error('bad xml');
		(Parser.prototype.parseString as Mock).mockRejectedValue(parseError);

		await expect(parseFeedUrl(helpers, feedUrl)).rejects.toBe(parseError);
	});

	describe('feedFetchFailedTransiently', () => {
		it('treats a 429 rate-limit response as transient', () => {
			expect(feedFetchFailedTransiently({ httpCode: '429' })).toBe(true);
			expect(feedFetchFailedTransiently({ response: { status: 429 } })).toBe(true);
			expect(feedFetchFailedTransiently({ statusCode: 429 })).toBe(true);
		});

		it('treats 5xx server errors as transient', () => {
			for (const status of [500, 502, 503, 504]) {
				expect(feedFetchFailedTransiently({ httpCode: String(status) })).toBe(true);
				expect(feedFetchFailedTransiently({ response: { status } })).toBe(true);
			}
		});

		it('does not treat permanent 4xx errors (other than 429) as transient', () => {
			for (const status of [400, 401, 403, 404]) {
				expect(feedFetchFailedTransiently({ httpCode: String(status) })).toBe(false);
				expect(feedFetchFailedTransiently({ response: { status } })).toBe(false);
			}
		});

		it('does not treat connection failures as transient', () => {
			expect(
				feedFetchFailedTransiently(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })),
			).toBe(false);
		});

		it('returns false for non-objects and missing status', () => {
			expect(feedFetchFailedTransiently(null)).toBe(false);
			expect(feedFetchFailedTransiently(new Error('boom'))).toBe(false);
		});
	});
});
