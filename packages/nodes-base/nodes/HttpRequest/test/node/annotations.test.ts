import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';
import type { INodeTypeBaseDescription } from 'n8n-workflow';

import { HttpRequestV1 } from '../../V1/HttpRequestV1.node';
import { HttpRequestV2 } from '../../V2/HttpRequestV2.node';

describe.each([
	[1, HttpRequestV1],
	[2, HttpRequestV2],
] as const)('HTTP Request v%i annotations', (typeVersion, NodeType) => {
	const baseDescription: INodeTypeBaseDescription = {
		displayName: 'HTTP Request',
		name: 'httpRequest',
		description: 'Makes an HTTP request and returns the response data',
		group: [],
	};
	const node = new NodeType(baseDescription);

	describe.each(['file', 'json', 'string'])('response format %s', (responseFormat) => {
		it.each([
			[{}, READ_ONLY_ANNOTATIONS],
			[{ requestMethod: 'GET' }, READ_ONLY_ANNOTATIONS],
			[{ requestMethod: 'HEAD' }, READ_ONLY_ANNOTATIONS],
			[{ requestMethod: 'OPTIONS' }, READ_ONLY_ANNOTATIONS],
			[{ requestMethod: 'PUT' }, { effect: 'write', destructive: true, idempotent: true }],
			[{ requestMethod: 'DELETE' }, { effect: 'write', destructive: true, idempotent: false }],
			[{ requestMethod: 'PATCH' }, { effect: 'write', destructive: true, idempotent: false }],
			[{ requestMethod: 'POST' }, { effect: 'write', destructive: true, idempotent: false }],
			[
				{ requestMethod: '={{ $json.requestMethod }}' },
				{ effect: 'write', destructive: true, idempotent: false },
			],
			[{ requestMethod: 'UNKNOWN' }, { effect: 'write', destructive: true, idempotent: false }],
		])('should resolve %j', (parameters, expected) => {
			expect(
				resolveNodeAnnotations(node.description, {
					parameters: { ...parameters, responseFormat },
					typeVersion,
				}),
			).toEqual(expected);
		});
	});
});
