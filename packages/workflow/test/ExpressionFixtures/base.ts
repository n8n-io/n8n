import type { GenericValue, IDataObject } from '@/Interfaces';

export interface ExpressionTestBase {
	type: string;
}

export interface ExpressionTestEvaluation extends ExpressionTestBase {
	type: 'evaluation';
	input: Array<IDataObject | GenericValue>;
	output: IDataObject | GenericValue;
}

export type ExpressionTests = ExpressionTestEvaluation;

export interface ExpressionTestFixture {
	expression: string;
	tests: ExpressionTests[];
}

export const baseFixtures: ExpressionTestFixture[] = [
	{
		expression: '={{$json["contact"]["FirstName"]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ contact: { FirstName: 'test' } }],
				output: 'test',
			},
			{
				type: 'evaluation',
				input: [{ contact: null }],
				output: undefined,
			},
		],
	},
	{
		expression: '={{ $json["test"] }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ test: 'value' }],
				output: 'value',
			},
			{
				type: 'evaluation',
				input: [{ test: 1 }],
				output: 1,
			},
			{
				type: 'evaluation',
				input: [{ test: null }],
				output: null,
			},
			{
				type: 'evaluation',
				input: [{}],
				output: undefined,
			},
		],
	},
	{
		expression: '={{$json["test"].json["message"]["message_id"]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ test: { json: { message: { message_id: 'value' } } } }],
				output: 'value',
			},
		],
	},
	{
		expression: '={{$json[$json["Set2"].json["apiKey"]]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ Set2: { json: { apiKey: 'testKey' } }, testKey: 'testValue' }],
				output: 'testValue',
			},
		],
	},
	{
		expression: '={{$json["get"].json["recipes"][0]["image"]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ get: { json: { recipes: [{ image: 'test' }] } } }],
				output: 'test',
			},
		],
	},
	{
		expression:
			'=https://example.com/api/v1/workspaces/{{$json["Clockify1"].parameter["workspaceId"]}}/projects/{{$json["Clockify1"].json["id"]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ Clockify1: { parameter: { workspaceId: 'test1' }, json: { id: 'test2' } } }],
				output: 'https://example.com/api/v1/workspaces/test1/projects/test2',
			},
		],
	},
	{
		expression: '= {{$json["dig check CF"].data["stdout"]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ 'dig check CF': { data: { stdout: 'testout' } } }],
				output: ' testout',
			},
		],
	},
	{
		expression: '={{$item(0).$json["Set URL"].json["base_domain"]}}{{$json["link"]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ 'Set URL': { json: { base_domain: 'left' } }, link: 'right' }],
				output: 'leftright',
			},
		],
	},
	{
		expression: '={{$runIndex}}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: 0,
			},
		],
	},
	{
		expression: '={{ new String().toString() }}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: '',
			},
		],
	},
	{
		expression:
			'={{(Date.parse($json["IF Zoom meeting"].json["end"]["dateTime"])-Date.parse($json["IF Zoom meeting"].json["start"]["dateTime"]))/(60*1000)}}',
		tests: [
			{
				type: 'evaluation',
				input: [
					{
						'IF Zoom meeting': {
							json: {
								end: { dateTime: '2023-02-09T13:32:54.187Z' },
								start: { dateTime: '2023-02-09T13:22:54.187Z' },
							},
						},
					},
				],
				output: 10,
			},
		],
	},
	{
		expression: '={{$json["GetTicket"].json["tickets"].length}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ GetTicket: { json: { tickets: [1, 2, 3, 4] } } }],
				output: 4,
			},
		],
	},
	{
		expression: '={{ $json.toString() }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ test: 1 }],
				output: '[object Object]',
			},
		],
	},
	{
		expression: '={{Math.floor(Math.min(1, 2) * 100);}}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: 100,
			},
		],
	},
	{
		expression: '={{$json["\u56fe\u7247\u6570\u91cf\u5224\u65ad"].data["imgList"][0]}}',
		tests: [
			{
				type: 'evaluation',
				input: [
					{
						'\u56fe\u7247\u6570\u91cf\u5224\u65ad': {
							data: { imgList: ['test'] },
						},
					},
				],
				output: 'test',
			},
		],
	},
	{
		expression: '={{ $json["phone"] ?? 0}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ phone: 'test' }],
				output: 'test',
			},
			{
				type: 'evaluation',
				input: [{ phone: null }],
				output: 0,
			},
			{
				type: 'evaluation',
				input: [{}],
				output: 0,
			},
			{
				type: 'evaluation',
				input: [],
				output: undefined,
			},
		],
	},
	{
		expression:
			"={{$json['Webhook1'].json[\"headers\"][\"x-api-key\"] +'-'+ new String('test').toString()}}",
		tests: [
			{
				type: 'evaluation',
				input: [{ Webhook1: { json: { headers: { 'x-api-key': 'left' } } } }],
				output: 'left-test',
			},
		],
	},
	{
		expression:
			'={{$json[\'Webhook1\'].json["headers"]["x-api-key"] +\'-\'+ parseInt($json.test)}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ Webhook1: { json: { headers: { 'x-api-key': 'left' } } }, test: 3 }],
				output: 'left-3',
			},
		],
	},
	{
		expression: '={{ [].concat($json["Create or update"].json["vid"]) }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ 'Create or update': { json: { vid: [1, 2, 3] } } }],
				output: [1, 2, 3],
			},
		],
	},
	{
		expression: '=https://example.com/test?id={{$json["Crypto"].json["data"].substr(0,6)}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ Crypto: { json: { data: 'testtest' } } }],
				output: 'https://example.com/test?id=testte',
			},
		],
	},
	{
		expression: '={{ $json["body"]["project"]["name"].match(/\\[(\\d+)]/)[1] }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ body: { project: { name: 'test[1234]' } } }],
				output: '1234',
			},
		],
	},
	{
		expression:
			'={{(new Date($json["end"]["date"]).getTime() - new Date($json["start"]["date"]).getTime()) / (1000 * 3600 * 24)}}',
		tests: [
			{
				type: 'evaluation',
				input: [
					{
						start: { date: '2023-02-09T13:22:54.187Z' },
						end: { date: '2023-02-13T13:22:54.187Z' },
					},
				],
				output: 4,
			},
		],
	},
	{
		expression:
			'={{ $json["projectName"] == "" ? "Project Group " + ($json["projectsCount"] + 1) : $json["projectName"] }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ projectName: '', projectsCount: 3 }],
				output: 'Project Group 4',
			},
			{
				type: 'evaluation',
				input: [{ projectName: 'Project Test', projectsCount: 3 }],
				output: 'Project Test',
			},
		],
	},
	{
		expression: '={{new Date($json["created_at"]).toISOString()}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ created_at: '2023-02-09T13:22:54.187Z' }],
				output: '2023-02-09T13:22:54.187Z',
			},
		],
	},
	{
		expression: '={{$json["Find by ID1"].json["fields"]["clicks"]+1}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ 'Find by ID1': { json: { fields: { clicks: 8 } } } }],
				output: 9,
			},
		],
	},
	{
		expression:
			'={{ (parseFloat($json["Bid"].replace(\',\', \'.\')) * parseFloat($json["Baserow"].json["Count"])).toFixed(2) }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ Bid: '3,80', Baserow: { json: { Count: '10' } } }],
				output: '38.00',
			},
		],
	},
	{
		expression:
			'={\n\t"article": {\n\t\t"title": "{{$json["body"]["entry"]["Title"]}}",\n\t\t"published": true,\n\t\t"article_markdown": "{{$json["body"]["entry"]["PostContent"]}}",\n\t\t"tags":["{{$json["body"]["entry"]["Tag"]}}"]\n\t}\n}',
		tests: [
			{
				type: 'evaluation',
				input: [
					{ body: { entry: { Title: 'title', PostContent: 'test contents', Tag: 'testTag' } } },
				],
				output: `{
	"article": {
		"title": "title",
		"published": true,
		"article_markdown": "test contents",
		"tags":["testTag"]
	}
}`,
			},
		],
	},
	{
		expression:
			'={{$json["Find by ID"].json["id"] != "" && $json["Find by ID"].json["id"] != null && $json["Find by ID"].json["id"] != undefined}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ 'Find by ID': { json: { id: 'test' } } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ 'Find by ID': { json: { id: '' } } }],
				output: false,
			},
			{
				type: 'evaluation',
				input: [{ 'Find by ID': { json: { id: null } } }],
				output: false,
			},
			{
				type: 'evaluation',
				input: [{ 'Find by ID': { json: {} } }],
				output: false,
			},
		],
	},
	{
		expression: '={{$json["HTTP Request"].json["paging"] ? true : false}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ 'HTTP Request': { json: { paging: 'test' } } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ 'HTTP Request': { json: {} } }],
				output: false,
			},
		],
	},
	{
		expression: '={{Math.min(1, 2);}}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: 1,
			},
		],
	},
	{
		expression: '={{ !!$json["different"]["name"] || !!$json["different"]["phone"] }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ different: { name: 'test' } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ different: { phone: 'test' } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ different: {} }],
				output: false,
			},
			{
				type: 'evaluation',
				input: [{ different: { phone: 'test', name: 'test2' } }],
				output: true,
			},
		],
	},
	{
		expression: '={{200}}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: 200,
			},
		],
	},
	{
		expression: '={{$json.assetValue * $json.value / 100}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ assetValue: 50, value: 50 }],
				output: 25,
			},
		],
	},
	{
		expression: '={{/^\\d+$/.test($json["search_term"])}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ search_term: '1234' }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ search_term: 'asdf' }],
				output: false,
			},
		],
	},
	{
		expression: '={{ `test\nvalue\nmulti\nline` }}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: `test
value
multi
line`,
			},
		],
	},
	{
		expression: '={{ { "data": $json.body.choices } }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ body: { choices: 'testValue' } }],
				output: { data: 'testValue' },
			},
		],
	},
	{
		expression: '={{ $json["data"]["errors"] && $json["data"]["errors"].length > 0 }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ data: { errors: [1, 2, 3, 4] } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ data: { errors: [] } }],
				output: false,
			},
			{
				type: 'evaluation',
				input: [{ data: {} }],
				output: undefined,
			},
		],
	},
	{
		expression: '={{asdas}}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: undefined,
			},
			{
				type: 'evaluation',
				input: [{ asdas: 1 }],
				output: undefined,
			},
		],
	},
	{
		expression: '={{!!$json["data"]["errors"]}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ data: { errors: [] } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ data: {} }],
				output: false,
			},
		],
	},
	{
		expression: '=TRUE',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: 'TRUE',
			},
		],
	},
	{
		expression: '={{ !$json?.data?.data?.issues?.pageInfo?.hasNextPage }}',
		tests: [
			{
				type: 'evaluation',
				input: [{ data: { data: { issues: { pageInfo: { hasNextPage: true } } } } }],
				output: false,
			},
			{
				type: 'evaluation',
				input: [{ data: { data: { issues: { pageInfo: { hasNextPage: false } } } } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ data: { data: { issues: { pageInfo: {} } } } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ data: { data: { issues: {} } } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ data: { data: {} } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ data: {} }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{}],
				output: true,
			},
		],
	},
	{
		expression: "={{ [{'name': 'something', 'batch_size':1000, 'ignore_cols':['x']}] }}",
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: [{ name: 'something', batch_size: 1000, ignore_cols: ['x'] }],
			},
		],
	},
	{
		expression: '={{typeof $json["person"].json["name"] != "undefined"}}',
		tests: [
			{
				type: 'evaluation',
				input: [{ person: { json: { name: 'test' } } }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ person: { json: {} } }],
				output: false,
			},
		],
	},
	{
		expression: "={{ $json?.data == undefined ? '' : $json.data }}",
		tests: [
			{
				type: 'evaluation',
				input: [{ data: 1 }],
				output: 1,
			},
			{
				type: 'evaluation',
				input: [{}],
				output: '',
			},
		],
	},
	{
		expression: "={{ 'domain' in $json && $json.domain != null}}",
		tests: [
			{
				type: 'evaluation',
				input: [{ domain: 1 }],
				output: true,
			},
			{
				type: 'evaluation',
				input: [{ domain: null }],
				output: false,
			},
			{
				type: 'evaluation',
				input: [{}],
				output: false,
			},
		],
	},
	{
		expression: '={{ String("testing").length }}',
		tests: [
			{
				type: 'evaluation',
				input: [],
				output: 7,
			},
		],
	},
];
