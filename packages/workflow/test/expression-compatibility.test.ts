// @vitest-environment jsdom

/* eslint-disable n8n-local-rules/no-interpolation-in-regular-string -- `${...}` is literal corpus data, not a template */

import * as Helpers from './helpers';
import { createRunExecutionData } from '../src';
import type { IExecuteData } from '../src/interfaces';
import { Workflow } from '../src/workflow';

// Compatibility corpus for expression syntax.
//
// Both engines run every case (see `vitest.config.ts`).

describe('Expression — compatibility corpus', () => {
	const workflow = new Workflow({
		id: '1',
		nodes: [
			{
				name: 'Webhook',
				typeVersion: 1,
				type: 'test.set',
				id: 'webhook-1',
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'Set Variables',
				typeVersion: 1,
				type: 'test.set',
				id: 'setvars-1',
				position: [100, 0],
				parameters: {},
			},
			{
				name: 'Rates',
				typeVersion: 1,
				type: 'test.set',
				id: 'rates-1',
				position: [200, 0],
				parameters: {},
			},
			{
				name: 'Current',
				typeVersion: 1,
				type: 'test.set',
				id: 'current-1',
				position: [300, 0],
				parameters: {},
			},
		],
		connections: {
			Webhook: { main: [[{ node: 'Set Variables', type: 'main', index: 0 }]] },
			'Set Variables': { main: [[{ node: 'Rates', type: 'main', index: 0 }]] },
			Rates: { main: [[{ node: 'Current', type: 'main', index: 0 }]] },
		},
		active: false,
		nodeTypes: Helpers.NodeTypes(),
	});
	const expression = workflow.expression;

	const runExecutionData = createRunExecutionData({
		executionData: {
			contextData: { 'node:Rates': { currentRunIndex: 2, maxRunIndex: 9 } },
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: {},
		},
		resultData: {
			runData: {
				Webhook: [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: {
							main: [
								[
									{
										pairedItem: { item: 0 },
										json: {
											body: {
												data: {
													properties: {
														'Channel Handle': {
															rollup: { array: [{ rich_text: [{ text: { content: 'acme' } }] }] },
														},
														'Quick Answer': {
															rich_text: [{ plain_text: 'yes' }, { plain_text: ' indeed' }],
														},
														Name: { title: [{ plain_text: 'Acme Corp' }] },
													},
												},
											},
											event: { files: [{ subtype: 'nested_reply' }] },
										},
									},
								],
							],
						},
					},
				],
				'Set Variables': [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 1,
						source: [{ previousNode: 'Webhook' }],
						data: {
							main: [
								[
									{
										pairedItem: { item: 0 },
										json: {
											prompt: 'why is the sky blue',
											storedExpression: '{{ 1 + 1 }}',
											code_text: 'AB',
											code_quantity: 3,
											query: { metrics: ['visits', 'pageviews'] },
										},
									},
								],
							],
						},
					},
				],
				Rates: [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 2,
						source: [{ previousNode: 'Set Variables' }],
						data: {
							main: [
								[
									{
										pairedItem: { item: 0 },
										json: { cardId: 'c1', procedureCode: 'P1', standardUnitCost: 100 },
									},
									{
										pairedItem: { item: 0 },
										json: { cardId: 'c2', procedureCode: 'P2', standardUnitCost: 250 },
									},
								],
							],
						},
					},
				],
			},
		},
	});

	const items = [
		{
			pairedItem: { item: 0 },
			json: {
				id: 42,
				name: 'Ada',
				text: 'Hello **World**',
				url: 'https://docs.example.com/guide/intro?q=1',
				amount: '1,234.5k',
				status: ['Exists', 'Does Not Exist', 'Does Not Exist'],
				blocks: [{ elements: [{ elements: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] }] }],
				nums: [3, 1, 2, 3, null],
				tags: ['x', 'y', 'z'],
				metadata: { a: 1 },
				testMetadata: { b: 2 },
				procedures: { code: 'P1', requestedUnitCost: 67 },
				selectedCardId: 'c1',
				dimensions: ['2026-08-24 10:30:00', 'DE'],
				metrics: [10, 20],
				jsonString: '{"k":[1,2,3]}',
				key: 'dimensions',
				zero: 0,
				flag: false,
				list: [3, 1, 2, 3],
				nested: { deep: { val: 7 } },
				html: '<p>hi<br/>there</p>',
				b64: 'YWJj',
				companyName: 'Acme, Inc. & Co',
				isoDate: '2026-08-24T10:30:00.000Z',
				millis: 1787567400000,
				licenseType: 'trial',
				activeWorkflows: -1,
				attendees: [{ email: 'a@gmail.com' }, { email: 'b@acme.io' }, { email: 'c@yahoo.com' }],
				parties: [
					{ affiliation: 'External', emailAddress: 'x@corp.test' },
					{ affiliation: 'Internal', emailAddress: 'y@inside.test' },
					{ affiliation: 'Unknown', emailAddress: 'z@other.test' },
				],
				sf: {
					Opportunities: { records: [{ StageName: 'Negotiation', Amount: 12000, Type: 'New' }] },
				},
				quote: { records: [{ TotalPrice: 1234.5 }] },
				emptyRecords: { records: [] },
				run: {
					workflow: { name: 'Nightly' },
					execution: {
						url: 'https://host/workflow/1/executions/9',
						error: { message: 'boom', timestamp: 1787567400000 },
					},
				},
				events: [
					{ summary: 'Standup', start: { dateTime: '2026-08-24T09:00:00.000Z' } },
					{ summary: null, start: { dateTime: '2026-08-24T11:00:00.000Z' } },
				],
				props: {
					Name: { title: [{ text: { content: 'Req A' } }] },
					'request-description': { rich_text: [{ plain_text: 'one' }, { plain_text: 'two' }] },
				},
				pair: { a: 1, b: 2 },
				plain: 'hello world',
				email: 'ada@example.com',
				csv: 'a, b ,c',
				multiline: 'line1\n  line2\r\n line3',
				empty: '',
				missing: null,
			},
			binary: {
				myFile: { data: '', mimeType: 'text/plain', fileName: 'report.pdf' },
				csvFile: { data: '', mimeType: 'text/csv', fileName: 'rows.csv' },
			},
		},
		{ pairedItem: { item: 1 }, json: { id: 43, name: 'Grace', tags: [] } },
	];

	beforeAll(async () => {
		await expression.acquireIsolate();
	});
	afterAll(async () => {
		await expression.releaseIsolate();
	});

	const executeData: IExecuteData = {
		data: { main: [items] },
		node: workflow.getNode('Current')!,
		source: { main: [{ previousNode: 'Rates', previousNodeOutput: 0, previousNodeRun: 0 }] },
	};

	const additionalKeys = {
		$execution: {
			id: 'exec-1',
			mode: 'test' as const,
			resumeUrl: 'https://example.test/resume',
			resumeFormUrl: 'https://example.test/form',
		},
		$vars: { region: 'eu-west', TEAM_IDS: '["t1"]' },
		$secrets: { vault: { token: 'placeholder' } },
		$pageCount: 2,
	};

	const ENGINE = process.env.N8N_EXPRESSION_ENGINE ?? 'vm';

	const evaluate = (expr: string) =>
		expression.getParameterValue(
			expr,
			runExecutionData,
			0,
			0,
			'Current',
			items,
			'manual',
			additionalKeys,
			executeData,
		);

	// ── exact-value cases ──────────────────────────────────────────────────
	const CASES: Array<[string, string, unknown]> = [
		[
			'jmespath projection + join',
			"={{ $jmespath($json.blocks[0].elements[0].elements, '[].text').join('') }}",
			'abc',
		],
		[
			'jmespath backtick literal in filter',
			'={{ $jmespath($json, \'length(status[?@ == `"Does Not Exist"`])\') }}',
			2,
		],
		[
			'$() deep bracket + quoted key chain',
			"={{ $('Webhook').item.json.body.data.properties['Channel Handle'].rollup.array[0].rich_text[0].text.content }}",
			'acme',
		],
		[
			'$() jmespath over node data',
			"={{ $jmespath($('Webhook').item.json.body.data.properties['Quick Answer'].rich_text,'[].plain_text').join('') }}",
			'yes indeed',
		],
		[
			'legacy $node[] bracket access',
			'={{ $node["Set Variables"].json["prompt"] }}',
			'why is the sky blue',
		],
		[
			'legacy $node[] with trailing semicolon',
			'={{ $node["Set Variables"].json["code_quantity"] + 1; }}',
			4,
		],
		['$().first() vs .item parity', "={{ $('Set Variables').first().json.code_text }}", 'AB'],
		[
			'$().all() + find + optional chain on result',
			"={{ $('Rates').all().find(r => r.json.cardId === $json.selectedCardId && r.json.procedureCode === $json.procedures.code)?.json.standardUnitCost }}",
			100,
		],
		['isExecuted guard', "={{ $('Webhook').isExecuted }}", true],
		[
			'$if + optional chain + nullish',
			'={{ $if($("Webhook").isExecuted, $("Webhook").item.json.event?.files?.[0]?.subtype ?? \'no-subtype\', \'no-subtype\') }}',
			'nested_reply',
		],
		[
			'$if + optional chain on missing path',
			'={{ $if($("Webhook").isExecuted, $("Webhook").item.json.event?.missing?.[0]?.subtype ?? \'no-subtype\', \'no-subtype\') }}',
			'no-subtype',
		],
		[
			'$ifEmpty + arrow + Object.keys + nullish',
			'={{ Number($ifEmpty($json.absent, []).filter(item => Object.keys(item ?? {}).length > 0).length) }}',
			0,
		],
		[
			'$if + spread merge + toJsonString',
			"={{ $if($execution.mode === 'test', {...$json.metadata, ...$json.testMetadata }.toJsonString(), $json.metadata.toJsonString()) }}",
			'{"a":1,"b":2}',
		],
		[
			'$if string concat of two $if',
			"={{ $if($('Webhook').isExecuted, 'a', '') + $if($('Rates').isExecuted, 'b', '') }}",
			'ab',
		],
		[
			'$evaluateExpression over stored string',
			"={{ $evaluateExpression($('Set Variables').first().json.storedExpression) }}",
			2,
		],
		[
			'$input.all() map + template literal + join',
			'={{ $input.all().map((item, index) => `${index + 1}. ${item.json.name ?? "(none)"}`).join(" | ") }}',
			'1. Ada | 2. Grace',
		],
		[
			'Object.assign + spread of mapped objects',
			"={{ Object.assign({ country: $json.dimensions[1] }, ...$('Set Variables').first().json.query.metrics.map((metric, i) => ({ [metric]: $json.metrics[i] }))).toJsonString() }}",
			'{"country":"DE","visits":10,"pageviews":20}',
		],
		[
			'Array.from with length + arrow',
			"={{ Array.from({ length: $('Set Variables').first().json.code_quantity }, (_, i) => `${$('Set Variables').first().json.code_text}-${i}`).join(',') }}",
			'AB-0,AB-1,AB-2',
		],
		[
			'IIFE with const + regex + Math.round',
			"={{ (() => { const s = String($json.amount || '').replace(/[\\s,]/g, ''); const m = s.match(/^([0-9]*\\.?[0-9]+)([kKmM])?$/); if (!m) return null; const mul = m[2] ? (m[2].toLowerCase() === 'k' ? 1e3 : 1e6) : 1; return Math.round(parseFloat(m[1]) * mul); })() }}",
			1234500,
		],
		[
			'IIFE returning null branch',
			'={{ (() => { const m = String($json.name).match(/^([0-9]+)$/); if (!m) return null; return 1; })() }}',
			null,
		],
		[
			'replace with global regex and capture',
			"={{ $json.multiline.replace(/[\\r\\n]+(\\s*)/g, ' ') }}",
			'line1 line2 line3',
		],
		['split on regex', "={{ $json.csv.split(/\\s*,\\s*/).join('|') }}", 'a|b|c'],
		[
			'match with optional chain on result',
			'={{ $json.url.match(/\\/guide\\/([^/?]+)/)?.[1] }}',
			'intro',
		],
		['extractDomain', '={{ $json.url.extractDomain() }}', 'docs.example.com'],
		['toSnakeCase', '={{ $json.name.toSnakeCase() }}', 'ada'],
		['urlEncode', "={{ 'a b&c'.urlEncode() }}", 'a%20b%26c'],
		['base64Encode', "={{ 'abc'.base64Encode() }}", 'YWJj'],
		['removeMarkdown', '={{ $json.text.removeMarkdown() }}', 'Hello World'],
		['isEmpty on empty string', '={{ $json.empty.isEmpty() }}', true],
		['compact drops null', '={{ $json.nums.compact().length }}', 4],
		['removeDuplicates', '={{ $json.nums.compact().removeDuplicates().join(",") }}', '3,1,2'],
		['sum', '={{ $json.metrics.sum() }}', 30],
		['average', '={{ $json.metrics.average() }}', 15],
		['chunk', '={{ $json.tags.chunk(2).length }}', 2],
		[
			'smartJoin',
			"={{ [{k:'a',v:1},{k:'b',v:2}].smartJoin('k','v').toJsonString() }}",
			'{"a":1,"b":2}',
		],
		['isNotEmpty on array', '={{ $json.tags.isNotEmpty() }}', true],
		['round', '={{ (1.2345).round(2) }}', 1.23],
		['ceil / floor', '={{ (1.2).ceil() + (1.8).floor() }}', 3],
		['isEven', '={{ (4).isEven() }}', true],
		['JSON.parse then index', '={{ JSON.parse($json.jsonString).k[2] }}', 3],
		[
			'JSON.stringify with indent',
			'={{ JSON.stringify($json.metadata, null, 2) }}',
			'{\n  "a": 1\n}',
		],
		[
			'Object.entries + map',
			'={{ Object.entries($json.metadata).map(([k, v]) => k + "=" + v).join(",") }}',
			'a=1',
		],
		['Object.fromEntries', '={{ Object.fromEntries([["x", 1]]).x }}', 1],
		['Math + parseInt', "={{ Math.max(parseInt('7', 10), 3) }}", 7],
		['encodeURIComponent', "={{ encodeURIComponent('a/b') }}", 'a%2Fb'],
		['nested ternary', "={{ $json.id > 100 ? 'big' : $json.id > 10 ? 'mid' : 'small' }}", 'mid'],
		['nullish chain on null', "={{ $json.missing ?? $json.name ?? 'fallback' }}", 'Ada'],
		['optional chaining on undefined root', '={{ $json.nope?.deeper?.value }}', undefined],
		['spread into array literal', '={{ [...$json.tags, "w"].join("") }}', 'xyzw'],
		['$workflow.id', '={{ $workflow.id }}', '1'],
		['$execution.mode', '={{ $execution.mode }}', 'test'],
		['$runIndex / $itemIndex arithmetic', '={{ $runIndex + $itemIndex }}', 0],
		['$prevNode.name', '={{ $prevNode.name }}', 'Rates'],
		['$binary filename', '={{ $binary.myFile.fileName }}', 'report.pdf'],
		[
			'two interpolations in one field',
			'=Order {{ $json.id }} for {{ $json.name }}',
			'Order 42 for Ada',
		],
		['interpolation adjacent to literal braces', '={{ $json.id }}/{{ $json.name }}', '42/Ada'],
		['whole-object interpolation returns the object', '={{ $json.metadata }}', { a: 1 }],
		['$items() length', '={{ $items("Rates").length }}', 2],
		['$items() indexed json', '={{ $items("Rates")[1].json.cardId }}', 'c2'],
		['itemMatching()', "={{ $('Rates').itemMatching(0).json.cardId }}", 'c1'],
		['computed key from a data value', '={{ $json[$json.key][1] }}', 'DE'],
		[
			'computed key from concatenation',
			"={{ $json['dim' + 'ensions'][0] }}",
			'2026-08-24 10:30:00',
		],
		['$vars', '={{ $vars.region }}', 'eu-west'],
		['$secrets nested', '={{ $secrets.vault.token }}', 'placeholder'],
		['$pageCount', '={{ $pageCount }}', 2],
		['reduce with initial value', '={{ $json.nums.compact().reduce((a, b) => a + b, 0) }}', 9],
		[
			'spread-copy then sort (non-mutating)',
			'={{ [...$json.nums.compact()].sort((a, b) => a - b).join(",") }}',
			'1,2,3,3',
		],
		['spread into Math.max', '={{ Math.max(...$json.metrics) }}', 20],
		[
			'filter + map + join chain',
			'={{ $json.tags.filter(t => t !== "y").map(t => t.toUpperCase()).join("-") }}',
			'X-Z',
		],
		['pluck over object array', "={{ [{n:1},{n:2}].pluck('n').join('+') }}", '1+2'],
		['Array.prototype.at(-1)', '={{ $json.tags.at(-1) }}', 'z'],
		[
			'arrow with object-destructured param',
			'={{ (({ id, name }) => id + name)($json) }}',
			'42Ada',
		],
		[
			'destructured entries in arrow',
			'={{ Object.entries($json.pair).map(([k, v]) => `${k}:${v}`).join(",") }}',
			'a:1,b:2',
		],
		[
			'const destructuring inside IIFE',
			'={{ (() => { const { id } = $json; return id; })() }}',
			42,
		],
		[
			'try/catch inside IIFE',
			'={{ (() => { try { return JSON.parse("nope"); } catch (e) { return "caught"; } })() }}',
			'caught',
		],
		['classic function expression IIFE', '={{ (function(){ return 1; })() }}', 1],
		['two statements returns the first', '={{ $json.id; $json.name }}', 42],
		['typeof', '={{ typeof $json.id }}', 'number'],
		['instanceof', '={{ $json.metadata instanceof Object }}', true],
		['nested template literal', '={{ `outer ${`inner ${$json.id}`}` }}', 'outer inner 42'],
		['optional call on missing member', '={{ $json.nope?.call?.() ?? "none" }}', 'none'],
		['block comment inside interpolation', '={{ /* comment */ $json.id }}', 42],
		['line comment inside interpolation', '={{ $json.id // trailing comment\n }}', 42],
		['new Date(0).toISOString()', '={{ new Date(0).toISOString() }}', '1970-01-01T00:00:00.000Z'],
		['Date.now comparison', '={{ Date.now() > 0 }}', true],
		['Number.parseFloat + parseInt', "={{ Number.parseFloat('1.5') + Number.parseInt('2') }}", 3.5],
		['luxon diff in hours', "={{ $now.diff($now.minus({ hours: 2 }), 'hours').hours }}", 2],
		['luxon plus comparison', '={{ $now.plus({ days: 1 }) > $now }}', true],
		['toTitleCase', '={{ $json.plain.toTitleCase() }}', 'Hello World'],
		['isEmail', '={{ $json.email.isEmail() }}', true],
		['hash length', "={{ $json.plain.hash('sha256').length }}", 64],
		['toJsonString on array', '={{ $json.tags.toJsonString() }}', '["x","y","z"]'],

		[
			'$json.sf.Opportunities?.records?.[0]?.StageName ?? "n/a"',
			'={{ $json.sf.Opportunities?.records?.[0]?.StageName ?? "n/a" }}',
			'Negotiation',
		],
		[
			'$json.emptyRecords?.records?.[0]?.StageName ?? "n/a"',
			'={{ $json.emptyRecords?.records?.[0]?.StageName ?? "n/a" }}',
			'n/a',
		],
		[
			'Number($json.emptyRecords.records?.[0]?.TotalPrice ?? 0)',
			'={{ Number($json.emptyRecords.records?.[0]?.TotalPrice ?? 0) }}',
			0,
		],
		[
			'$json.run.workflow?.name ?? "unknown workflow"',
			'={{ $json.run.workflow?.name ?? "unknown workflow" }}',
			'Nightly',
		],
		[
			'$json.run.execution?.error?.message ?? $json.run.trigger?.err...',
			'={{ $json.run.execution?.error?.message ?? $json.run.trigger?.error?.message ?? "no message" }}',
			'boom',
		],
		[
			'$json.run.trigger?.error?.node?.name ?? $json.run.execution?....',
			'={{ $json.run.trigger?.error?.node?.name ?? $json.run.execution?.lastNodeExecuted ?? "unknown" }}',
			'unknown',
		],
		[
			'$json.run.execution.url.split("/executions/")[0]',
			'={{ $json.run.execution.url.split("/executions/")[0] }}',
			'https://host/workflow/1',
		],
		[
			'$json.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").su...',
			'={{ $json.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30) }}',
			'acme--inc----co',
		],
		[
			'String($itemIndex + 1).padStart(2, "0")',
			'={{ String($itemIndex + 1).padStart(2, "0") }}',
			'01',
		],
		[
			'$jmespath($json.parties, "[?affiliation==`External`].emailAdd...',
			'={{ $jmespath($json.parties, "[?affiliation==`External`].emailAddress").join(",") }}',
			'x@corp.test',
		],
		[
			'$jmespath($json.parties, "[?affiliation==`External` || affili...',
			'={{ $jmespath($json.parties, "[?affiliation==`External` || affiliation==`Unknown`].emailAddress").join(",") }}',
			'x@corp.test,z@other.test',
		],
		[
			'$jmespath($json.props["request-description"].rich_text, "[].p...',
			'={{ $jmespath($json.props["request-description"].rich_text, "[].plain_text").join() }}',
			'one,two',
		],
		[
			'$jmespath($json.props, "Name.title[0].text.content")',
			'={{ $jmespath($json.props, "Name.title[0].text.content") }}',
			'Req A',
		],
		[
			'(() => { const free = ["gmail.com","yahoo.com"]; const emails...',
			'={{ (() => { const free = ["gmail.com","yahoo.com"]; const emails = $jmespath($json.attendees, "[].email"); const dom = (m) => m.match(/@([\\w.-]+)/)?.[1]; return emails.map(dom).filter(d => d && !free.includes(d.toLowerCase()))[0] || "Unknown"; })() }}',
			'acme.io',
		],
		[
			'(() => { const c = 3, t = 10, l = 10, f = Math.floor((c/t)*l)...',
			'={{ (() => { const c = 3, t = 10, l = 10, f = Math.floor((c/t)*l), r = l - f, p = Math.floor((c/t)*100); return "#".repeat(f) + "-".repeat(r) + " " + p + "%"; })() }}',
			'###------- 30%',
		],
		[
			'["trial","nonprofit"].includes($json.licenseType)',
			'={{ ["trial","nonprofit"].includes($json.licenseType) }}',
			true,
		],
		[
			'$if(!["trial","nonprofit"].includes($json.licenseType) || $js...',
			'={{ $if(!["trial","nonprofit"].includes($json.licenseType) || $json.activeWorkflows == -1, "yes", "no") }}',
			'yes',
		],
		[
			'$if(["trial","nonprofit"].includes($json.licenseType), "P2W",...',
			'={{ $if(["trial","nonprofit"].includes($json.licenseType), "P2W", "P12M") }}',
			'P2W',
		],
		[
			'DateTime.fromISO($json.isoDate).setZone("UTC").toFormat("MMMM...',
			'={{ DateTime.fromISO($json.isoDate).setZone("UTC").toFormat("MMMM d, yyyy") }}',
			'August 24, 2026',
		],
		[
			'DateTime.fromMillis($json.millis).setZone("UTC").toISO()',
			'={{ DateTime.fromMillis($json.millis).setZone("UTC").toISO() }}',
			'2026-08-24T10:30:00.000Z',
		],
		[
			'DateTime.fromISO($json.isoDate).setZone("UTC").startOf("day")...',
			'={{ DateTime.fromISO($json.isoDate).setZone("UTC").startOf("day").toISO() }}',
			'2026-08-24T00:00:00.000Z',
		],
		[
			'DateTime.fromISO($json.isoDate).diff(DateTime.fromISO("2026-0...',
			'={{ DateTime.fromISO($json.isoDate).diff(DateTime.fromISO("2026-08-23T10:30:00.000Z"), "days").days }}',
			1,
		],
		[
			'$json.run.execution?.error?.timestamp ? DateTime.fromMillis($...',
			'={{ $json.run.execution?.error?.timestamp ? DateTime.fromMillis($json.run.execution.error.timestamp).setZone("UTC").toISO() : "none" }}',
			'2026-08-24T10:30:00.000Z',
		],
		[
			'(1234.5).toLocaleString("en-US", { minimumFractionDigits: 2, ...',
			'={{ (1234.5).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}',
			'1,234.50',
		],
		[
			'$json.sf.Opportunities.records[0].Amount.toLocaleString("en-U...',
			'={{ $json.sf.Opportunities.records[0].Amount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}',
			'$12,000',
		],
		[
			'new Date($json.isoDate).toLocaleTimeString("en-US", { hour: "...',
			'={{ new Date($json.isoDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }) }}',
			'10:30 AM',
		],
		[
			'$input.all().map((it, i) => `${i + 1}. ${it.json.id}`).join("...',
			'={{ $input.all().map((it, i) => `${i + 1}. ${it.json.id}`).join("\\n") }}',
			'1. 42\n2. 43',
		],
		[
			'$input.all().map(it => Object.keys(it.json)[0]).join(",")',
			'={{ $input.all().map(it => Object.keys(it.json)[0]).join(",") }}',
			'id,id',
		],
		[
			'$json.events.map((ev, i) => `${i+1}. ${ev.summary || "No titl...',
			'={{ $json.events.map((ev, i) => `${i+1}. ${ev.summary || "No title"}`).join(" | ") }}',
			'1. Standup | 2. No title',
		],
		[
			'$json.events.map(ev => DateTime.fromISO(ev.start.dateTime).se...',
			'={{ $json.events.map(ev => DateTime.fromISO(ev.start.dateTime).setZone("UTC").toFormat("HH:mm")).join("-") }}',
			'09:00-11:00',
		],
		['$node["Rates"].context.currentRunIndex', '={{ $node["Rates"].context.currentRunIndex }}', 2],
		['$node["Rates"].context["maxRunIndex"]', '={{ $node["Rates"].context["maxRunIndex"] }}', 9],
		[
			'stage {{ $json.sf.Opportunities?.records?.[0]?.StageName ?? "...',
			'=stage {{ $json.sf.Opportunities?.records?.[0]?.StageName ?? "n/a" }} amount {{ $json.sf.Opportunities?.records?.[0]?.Amount ?? 0 }}',
			'stage Negotiation amount 12000',
		],
		[
			'{"a": "{{ $json.name }}", "b": {{ $json.id }}, "c": {{ $json....',
			'={"a": "{{ $json.name }}", "b": {{ $json.id }}, "c": {{ $json.licenseType == "trial" }}}',
			'{"a": "Ada", "b": 42, "c": true}',
		],
		[
			'Object.entries({ a: 1, b: 2 }).reduce((acc, [k, v]) => acc + ...',
			'={{ Object.entries({ a: 1, b: 2 }).reduce((acc, [k, v]) => acc + k + v, "") }}',
			'a1b2',
		],
		[
			'$json.parties.reduce((acc, p) => { acc[p.affiliation] = p.ema...',
			'={{ $json.parties.reduce((acc, p) => { acc[p.affiliation] = p.emailAddress; return acc; }, {}).toJsonString() }}',
			'{"External":"x@corp.test","Internal":"y@inside.test","Unknown":"z@other.test"}',
		],
		[
			'$("Rates").all().map(r => r.json.standardUnitCost).slice().sort((a, b) =>...',
			'={{ $("Rates").all().map(r => r.json.standardUnitCost).slice().sort((a, b) => b - a).join(",") }}',
			'250,100',
		],
		[
			'[...$("Rates").all()].map(r => r.json.cardId).join("+")',
			'={{ [...$("Rates").all()].map(r => r.json.cardId).join("+") }}',
			'c1+c2',
		],
		[
			'$("Rates").all().filter(r => r.json.standardUnitCost > 100).map(r => r.js...',
			'={{ $("Rates").all().filter(r => r.json.standardUnitCost > 100).map(r => r.json.cardId).join() }}',
			'c2',
		],
		[
			'$("Rates").all().find(r => r.json.standardUnitCost === 250)?.json.cardId ...',
			'={{ $("Rates").all().find(r => r.json.standardUnitCost === 250)?.json.cardId ?? "none" }}',
			'c2',
		],
		[
			'$("Rates").all().some(r => r.json.standardUnitCost > 200)',
			'={{ $("Rates").all().some(r => r.json.standardUnitCost > 200) }}',
			true,
		],
		[
			'$("Rates").all().every(r => r.json.standardUnitCost > 50)',
			'={{ $("Rates").all().every(r => r.json.standardUnitCost > 50) }}',
			true,
		],
		['[[1,2],[3]].flat().join(",")', '={{ [[1,2],[3]].flat().join(",") }}', '1,2,3'],
		[
			'$json.tags.flatMap(t => [t, t.toUpperCase()]).join("")',
			'={{ $json.tags.flatMap(t => [t, t.toUpperCase()]).join("") }}',
			'xXyYzZ',
		],
		['`${$json.name} <${$json.id}>`', '={{ `${$json.name} <${$json.id}>` }}', 'Ada <42>'],
		['JSON.parse($vars.TEAM_IDS)[0]', '={{ JSON.parse($vars.TEAM_IDS)[0] }}', 't1'],
		[
			'JSON.stringify({ teams: JSON.parse($vars.TEAM_IDS), region: $...',
			'={{ JSON.stringify({ teams: JSON.parse($vars.TEAM_IDS), region: $vars.region }) }}',
			'{"teams":["t1"],"region":"eu-west"}',
		],
		[
			'"Ada, Inc.".replace(/[^\\\\p{L}\\\\p{N} ]/gu, "").trim()',
			'={{ "Ada, Inc.".replace(/[^\\p{L}\\p{N} ]/gu, "").trim() }}',
			'Ada Inc',
		],
		[
			'[..."a1b2".matchAll(/\\\\d/g)].map(m => m[0]).join("")',
			'={{ [..."a1b2".matchAll(/\\d/g)].map(m => m[0]).join("") }}',
			'12',
		],
		[
			'"A-B-C".split("-").reverse().join("")',
			'={{ "A-B-C".split("-").reverse().join("") }}',
			'CBA',
		],
		[
			'/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/.test("2026-08-24")',
			'={{ /^\\d{4}-\\d{2}-\\d{2}$/.test("2026-08-24") }}',
			true,
		],
		[
			'Math.round(((120 - 100) / 100) * 1000) / 10',
			'={{ Math.round(((120 - 100) / 100) * 1000) / 10 }}',
			20,
		],
		['(0.1 + 0.2).toFixed(2)', '={{ (0.1 + 0.2).toFixed(2) }}', '0.30'],
		[
			'$node["Rates"].context.currentRunIndex + 1 }}/{{ $node["Rates...',
			'={{ $node["Rates"].context.currentRunIndex + 1 }}/{{ $node["Rates"].context["maxRunIndex"] }}',
			'3/9',
		],
		['`a}b`', '={{ `a}b` }}', 'a}b'],
		['\'mixed \\"quotes\\" here\'', '={{ \'mixed "quotes" here\' }}', 'mixed "quotes" here'],
		['"back\\\\\\\\slash"', '={{ "back\\\\slash" }}', 'back\\slash'],
		[
			'// leading comment  $json.id +   1',
			'={{\n\n  // leading comment\n  $json.id +\n\n  1\n\n}}',
			43,
		],
		[
			'(() => { let s = 0; for (const n of $json.list) s += n; retur...',
			'={{ (() => { let s = 0; for (const n of $json.list) s += n; return s; })() }}',
			9,
		],
		[
			'(() => { let i = 0, out = ""; while (i < 3) { out += i; i++; ...',
			'={{ (() => { let i = 0, out = ""; while (i < 3) { out += i; i++; } return out; })() }}',
			'012',
		],
		[
			'(() => { switch ($json.id) { case 42: return "answer"; defaul...',
			'={{ (() => { switch ($json.id) { case 42: return "answer"; default: return "other"; } })() }}',
			'answer',
		],
		[
			'(() => { const f = function fact(n) { return n <= 1 ? 1 : n *...',
			'={{ (() => { const f = function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); }; return f(5); })() }}',
			120,
		],
		[
			'(() => { const fns = []; for (let i = 0; i < 3; i++) fns.push...',
			'={{ (() => { const fns = []; for (let i = 0; i < 3; i++) fns.push(() => i); return fns.map(f => f()).join(""); })() }}',
			'012',
		],
		[
			'(() => { do { break; } while (true); return "done"; })()',
			'={{ (() => { do { break; } while (true); return "done"; })() }}',
			'done',
		],
		[
			'(() => { const o = { a: 1 }; for (const k in o) return k; ret...',
			'={{ (() => { const o = { a: 1 }; for (const k in o) return k; return "none"; })() }}',
			'a',
		],
		['new RegExp("a+").test("aaa")', '={{ new RegExp("a+").test("aaa") }}', true],
		['new Array(3).fill(1).join(",")', '={{ new Array(3).fill(1).join(",") }}', '1,1,1'],
		['new Set([1, 1, 2]).size', '={{ new Set([1, 1, 2]).size }}', 2],
		[
			'JSON.parse(\\\'{"a":1}\\\', (k, v) => typeof v === "number" ? v *...',
			'={{ JSON.parse(\'{"a":1}\', (k, v) => typeof v === "number" ? v * 2 : v).a }}',
			2,
		],
		[
			'JSON.parse(JSON.stringify($json.nested)).deep.val',
			'={{ JSON.parse(JSON.stringify($json.nested)).deep.val }}',
			7,
		],
		[
			'({ ...$json.nested.deep, extra: 1 }).toJsonString()',
			'={{ ({ ...$json.nested.deep, extra: 1 }).toJsonString() }}',
			'{"val":7,"extra":1}',
		],
		['$json.nul ?? "was null"', '={{ $json.nul ?? "was null" }}', 'was null'],
		['$json.zero || "was zero"', '={{ $json.zero || "was zero" }}', 'was zero'],
		['$json.zero ?? "not null"', '={{ $json.zero ?? "not null" }}', 0],
		['$json.html.removeTags()', '={{ $json.html.removeTags() }}', 'hithere'],
		['$json.b64.base64Decode()', '={{ $json.b64.base64Decode() }}', 'abc'],
		['$json.list.removeDuplicates().sum()', '={{ $json.list.removeDuplicates().sum() }}', 6],
		['$json.list.union([9]).join(",")', '={{ $json.list.union([9]).join(",") }}', '3,1,2,9'],
		[
			'$json.list.intersection([2,3]).join(",")',
			'={{ $json.list.intersection([2,3]).join(",") }}',
			'3,2',
		],
		['$json.list.difference([3]).join(",")', '={{ $json.list.difference([3]).join(",") }}', '1,2'],
		['Object.keys($binary).join(",")', '={{ Object.keys($binary).join(",") }}', 'myFile,csvFile'],
		['$binary.csvFile.mimeType', '={{ $binary.csvFile.mimeType }}', 'text/csv'],
		['$prevNode.outputIndex', '={{ $prevNode.outputIndex }}', 0],
		['$execution.id', '={{ $execution.id }}', 'exec-1'],
		['$workflow.active', '={{ $workflow.active }}', false],
		['`${$runIndex}:${$itemIndex}`', '={{ `${$runIndex}:${$itemIndex}` }}', '0:0'],
		['$("Rates").first()?.json?.cardId', '={{ $("Rates").first()?.json?.cardId }}', 'c1'],
		[
			'$("Rates").isExecuted ? $("Rates").last().json.cardId : "not ...',
			'={{ $("Rates").isExecuted ? $("Rates").last().json.cardId : "not run" }}',
			'c2',
		],
	];

	it.each(CASES)('%s', (_name, expr, want) => {
		expect(evaluate(expr)).toStrictEqual(want);
	});

	// ── shape-only cases (time dependent) ─────────────────────────────────
	const SHAPE_CASES: Array<[string, string, RegExp]> = [
		[
			'$now.toISO()',
			'={{ $now.toISO() }}',
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/,
		],
		[
			'$now.minus({days}).toISO()',
			'={{ $now.minus({ days: 42 }).toISO() }}',
			/^\d{4}-\d{2}-\d{2}T/,
		],
		['$now.format(yyyy)', "={{ $now.format('yyyy') }}", /^\d{4}$/],
		[
			'DateTime.fromFormat + setZone + toISO',
			"={{ DateTime.fromFormat($json.dimensions[0], 'yyyy-MM-dd HH:mm:ss').setZone('UTC').toISO() }}",
			/^2026-08-24T\d{2}:30:00\.000Z$/,
		],
		[
			'$today.startOf month',
			"={{ $today.startOf('month').toFormat('yyyy-MM-dd') }}",
			/^\d{4}-\d{2}-01$/,
		],
	];

	it.each(SHAPE_CASES)('%s', (_name, expr, pattern) => {
		expect(String(evaluate(expr))).toMatch(pattern);
	});

	// ── syntax outside the supported subset ───────────────────────────────
	const REJECTED: Array<[string, string]> = [
		['constructor access', '={{ $json.id.constructor.name }}'],
		['prototype access', '={{ $json.metadata.__proto__ === Object.prototype }}'],
		['this.constructor', '={{ this.constructor }}'],
		['with statement', '={{ with ($json) { id } }}'],
		['async arrow', '={{ async () => 1 }}'],
		['object literal with a getter', '={{ ({ get v() { return 7; } }).v }}'],
		['"}}"', '={{ "}}" }}'],
		['"{{" + "}}"', '={{ "{{" + "}}" }}'],
		['literal {{ }} braces? {{ 1 + 1', '=literal {{ }} braces? {{ 1 + 1 }}'],
	];

	it.each(REJECTED)('rejects: %s', (_name, expr) => {
		expect(() => evaluate(expr)).toThrow();
	});

	// ── known engine divergences ──────────────────────────────────────────
	const ENGINE_DIVERGENCES: Array<[string, string, unknown, unknown]> = [
		[
			'in-place sort on the raw $json array proxy',
			'={{ $json.metrics.sort((a, b) => b - a).join(",") }}',
			'20,10',
			undefined,
		],
		[
			'in-place sort discards the rest of the expression',
			'={{ ($json.metrics.sort(), "after") }}',
			'after',
			undefined,
		],
		[
			'splice on the raw $json array proxy',
			'={{ $json.metrics.splice(0, 1).join(",") }}',
			'10',
			undefined,
		],
		['Number.format()', "={{ (1234.5678).format('0,0.00') }}", undefined, '1234.5678'],
	];

	it.each(ENGINE_DIVERGENCES)('divergent: %s', (_name, expr, legacyWant, vmWant) => {
		expect(evaluate(expr)).toStrictEqual(ENGINE === 'legacy' ? legacyWant : vmWant);
	});
});
