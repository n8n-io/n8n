import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IPollFunctions,
} from 'n8n-workflow';
import { sanitizeXmlName } from 'n8n-workflow';
import Parser from 'rss-parser';

const DEFAULT_HEADERS = {
	'User-Agent': 'rss-parser',
	Accept: 'application/rss+xml',
};

const RELAXED_ACCEPT_HEADER =
	'application/rss+xml, application/rdf+xml;q=0.8, application/atom+xml;q=0.6, application/xml;q=0.4, text/xml;q=0.4';

type RequestHelpers = IExecuteFunctions['helpers'] | IPollFunctions['helpers'];

export async function parseFeedXml(
	feedXml: string,
	customFields?: string,
): Promise<Parser.Output<IDataObject>> {
	const parserOptions: Parser.ParserOptions<IDataObject, IDataObject> = {
		xml2js: {
			tagNameProcessors: [sanitizeXmlName],
			attrNameProcessors: [sanitizeXmlName],
		},
		...(customFields
			? { customFields: { item: customFields.split(',').map((field) => field.trim()) } }
			: {}),
	};

	return await new Parser(parserOptions).parseString(feedXml);
}

export async function parseFeedUrl(
	helpers: RequestHelpers,
	feedUrl: string,
	options: {
		customFields?: string;
		ignoreSSL?: boolean;
		useRelaxedAcceptHeader?: boolean;
	} = {},
): Promise<Parser.Output<IDataObject>> {
	const headers = {
		...DEFAULT_HEADERS,
		...(options.useRelaxedAcceptHeader ? { Accept: RELAXED_ACCEPT_HEADER } : {}),
	};

	const requestOptions: IHttpRequestOptions = {
		method: 'GET',
		url: feedUrl,
		headers,
		json: false,
		encoding: 'text',
		skipSslCertificateValidation: options.ignoreSSL,
	};

	const feedXmlResponse = await helpers.httpRequest(requestOptions);
	const feedXml = typeof feedXmlResponse === 'string' ? feedXmlResponse : String(feedXmlResponse);

	return await parseFeedXml(feedXml, options.customFields);
}
