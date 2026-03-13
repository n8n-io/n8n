import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { HttpRequestV1 } from './V1/HttpRequestV1.node';
import { HttpRequestV2 } from './V2/HttpRequestV2.node';
import { HttpRequestV3 } from './V3/HttpRequestV3.node';

export class HttpRequest extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP Request',
			name: 'httpRequest',
			icon: { light: 'file:httprequest.svg', dark: 'file:httprequest.dark.svg' },
			group: ['output'],
			subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
			description: 'Makes an HTTP request and returns the response data',
			defaultVersion: 4.4,
			builderHint: {
				message:
					'Prefer dedicated integration nodes over HTTP Request — n8n has 400+ dedicated nodes (e.g. Gmail, Slack, Google Sheets, Notion, OpenAI, HubSpot, Jira, etc.) with built-in authentication, pre-configured parameters, better error handling, and easier maintenance. Only use HTTP Request when no dedicated node exists for the service, the user explicitly requests it, accessing a custom/internal API, or the dedicated node does not support the specific operation needed.',
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new HttpRequestV1(baseDescription),
			2: new HttpRequestV2(baseDescription),
			3: new HttpRequestV3(baseDescription),
			4: new HttpRequestV3(baseDescription),
			4.1: new HttpRequestV3(baseDescription),
			4.2: new HttpRequestV3(baseDescription),
			4.3: new HttpRequestV3(baseDescription),
			4.4: new HttpRequestV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
