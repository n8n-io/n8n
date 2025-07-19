import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

// eslint-disable-next-line n8n-local-rules/no-unneeded-backticks
const feed = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0"><channel><title><![CDATA[Lorem ipsum feed for an interval of 1 minutes with 3 item(s)]]></title><description><![CDATA[This is a constantly updating lorem ipsum feed]]></description><link>http://example.com/</link><generator>RSS for Node</generator><lastBuildDate>Thu, 09 Feb 2023 13:40:32 GMT</lastBuildDate><pubDate>Thu, 09 Feb 2023 13:40:00 GMT</pubDate><copyright><![CDATA[Michael Bertolacci, licensed under a Creative Commons Attribution 3.0 Unported License.]]></copyright><ttl>1</ttl><item><title><![CDATA[Lorem ipsum 2023-02-09T13:40:00Z]]></title><description><![CDATA[Fugiat excepteur exercitation tempor ut aute sunt pariatur veniam pariatur dolor.]]></description><link>http://example.com/test/1675950000</link><guid isPermaLink="true">http://example.com/test/1675950000</guid><dc:creator><![CDATA[John Smith]]></dc:creator><pubDate>Thu, 09 Feb 2023 13:40:00 GMT</pubDate><custom>custom</custom></item><item><title><![CDATA[Lorem ipsum 2023-02-09T13:39:00Z]]></title><description><![CDATA[Laboris quis nulla tempor eu ullamco est esse qui aute commodo aliqua occaecat.]]></description><link>http://example.com/test/1675949940</link><guid isPermaLink="true">http://example.com/test/1675949940</guid><dc:creator><![CDATA[John Smith]]></dc:creator><pubDate>Thu, 09 Feb 2023 13:39:00 GMT</pubDate><custom>custom</custom></item><item><title><![CDATA[Lorem ipsum 2023-02-09T13:38:00Z]]></title><description><![CDATA[Irure labore dolor dolore sint aliquip eu anim aute anim et nulla adipisicing nostrud.]]></description><link>http://example.com/test/1675949880</link><guid isPermaLink="true">http://example.com/test/1675949880</guid><dc:creator><![CDATA[John Smith]]></dc:creator><pubDate>Thu, 09 Feb 2023 13:38:00 GMT</pubDate><custom>custom</custom></item></channel></rss>`;

describe('Test RSS Feed Trigger Node', () => {
	beforeAll(() => {
		nock('https://lorem-rss.herokuapp.com').get('/feed?length=3').reply(200, feed);
		nock('https://fake-rss-feed.com')
			.get('/feed')
			.reply(200, feed, { 'Content-Type': 'application/xml; charset=utf-8' });
		nock('https://custom-rss-feed.com').get('/feed').reply(200, feed);
	});

	new NodeTestHarness().setupTests();
});
