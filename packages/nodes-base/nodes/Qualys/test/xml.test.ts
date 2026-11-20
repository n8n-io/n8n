import { findNextBatchUrl, parseQualysXml, pluck } from '../transport/xml';

describe('Qualys XML parsing', () => {
	it('should parse elements and coerce safe integers', async () => {
		const parsed = await parseQualysXml('<R><A>7</A><B>007</B><C>4.7</C><D>null</D></R>');

		expect(parsed).toEqual({ R: { A: 7, B: '007', C: '4.7', D: null } });
	});

	it('should keep attributes next to child elements', async () => {
		const parsed = await parseQualysXml('<R><N id="7" kind="a"><C>1</C></N></R>');

		expect(parsed.R).toEqual({ N: { id: 7, kind: 'a', C: 1 } });
	});

	it('should put text under value when an element also has attributes', async () => {
		const parsed = await parseQualysXml('<R><N a="x &amp; y">1 &lt; 2</N></R>');

		expect(parsed.R).toEqual({ N: { value: '1 < 2', a: 'x & y' } });
	});

	it('should keep both text and children in mixed content', async () => {
		const parsed = await parseQualysXml('<R><N>text<C>1</C></N></R>');

		expect(parsed.R).toEqual({ N: { value: 'text', C: 1 } });
	});

	it('should read CDATA and skip the declaration, DOCTYPE and comments', async () => {
		const parsed = await parseQualysXml(
			'<?xml version="1.0" encoding="UTF-8" ?>\n' +
				'<!DOCTYPE R SYSTEM "https://qualysapi.example/r.dtd">\n' +
				'<!-- generated --><R><C><![CDATA[<b>raw & kept</b>]]></C><E/><E></E></R>',
		);

		expect(Object.keys(parsed)).toEqual(['R']);
		expect(parsed.R).toEqual({ C: '<b>raw & kept</b>', E: [null, null] });
	});

	it('should return listed elements as arrays when only one is present', async () => {
		const parsed = await parseQualysXml(
			'<R><HOST_LIST><HOST><ID>1</ID><IP>10.0.0.1</IP></HOST></HOST_LIST>' +
				'<IP_SET><IP>10.0.0.2</IP></IP_SET></R>',
		);

		expect(pluck(parsed, 'R.HOST_LIST.HOST')).toEqual([{ ID: 1, IP: '10.0.0.1' }]);
		expect(pluck(parsed, 'R.IP_SET.IP')).toEqual(['10.0.0.2']);
	});

	it('should flatten attribute-keyed lists and hoist their container', async () => {
		const parsed = await parseQualysXml(
			'<R><QDS_FACTORS><QDS_FACTOR name="CVSS">4.7</QDS_FACTOR>' +
				'<QDS_FACTOR>no name attribute</QDS_FACTOR></QDS_FACTORS>' +
				'<COUNTS><VULN_COUNT qds_severity="2">50</VULN_COUNT></COUNTS></R>',
		);

		expect(parsed.R).toEqual({ QDS_FACTORS: { CVSS: '4.7' }, COUNTS: { VULN_COUNT: { '2': 50 } } });
	});

	it('should reject malformed XML', async () => {
		await expect(parseQualysXml('<R><A>1</B></R>')).rejects.toThrow();
	});

	it('should find a next-batch URL wherever it is nested', async () => {
		expect(
			findNextBatchUrl(
				await parseQualysXml('<A><B><WARNING><URL>https://x/1</URL></WARNING></B></A>'),
			),
		).toBe('https://x/1');
		expect(
			findNextBatchUrl(await parseQualysXml('<A><WARNING><URL>   </URL></WARNING></A>')),
		).toBeUndefined();
		expect(findNextBatchUrl({ WARNING: [{ CODE: 1 }, { URL: 'https://x/3' }] })).toBe(
			'https://x/3',
		);
		expect(findNextBatchUrl({ nothing: true })).toBeUndefined();
	});
});
