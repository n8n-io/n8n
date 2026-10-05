import type { INode, INodeParameters, INodeTypes } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { GristOAuth2Api } from '../../../credentials/GristOAuth2Api.credentials';
import { gristBaseUrl } from '../GenericFunctions';

// The connect flow has to accept the same URLs requests do, otherwise a Grist URL with a trailing
// slash or `/api` gives working data calls and a broken connect.
describe('Grist OAuth2 endpoint expressions', () => {
	// Same setup as the expression tests in packages/workflow/test/expression.test.ts.
	const node: INode = {
		id: 'uuid-1234',
		name: 'node',
		typeVersion: 1,
		type: 'test.set',
		position: [0, 0],
		parameters: {},
	};
	const workflow = new Workflow({
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: mock<INodeTypes>(),
	});
	const expression = workflow.expression;

	beforeAll(async () => await expression.acquireIsolate());
	afterAll(async () => await expression.releaseIsolate());

	/** Resolves the credential's endpoint expressions against a given Grist URL. */
	const endpointsFor = (url: string) => {
		const { properties } = new GristOAuth2Api();
		const self: INodeParameters = Object.fromEntries(properties.map((p) => [p.name, p.default]));
		self.url = url;

		// Passed as both the value and `selfData`, which is what makes `$self` resolve.
		return expression.getComplexParameterValue(
			node,
			self,
			'manual',
			{},
			undefined,
			undefined,
			self,
		) as { authUrl: string; accessTokenUrl: string };
	};

	it('builds the endpoints from a plain Grist URL', () => {
		const { authUrl, accessTokenUrl } = endpointsFor('https://api.getgrist.com');

		expect(authUrl).toBe('https://api.getgrist.com/oidc/auth');
		expect(accessTokenUrl).toBe('https://api.getgrist.com/oidc/token');
	});

	// The expression duplicates `normalizeBaseUrl`, which cannot be imported into an expression.
	// Comparing against it directly is what catches the two drifting apart.
	it.each([
		'https://grist.example.com',
		'https://grist.example.com/',
		'https://grist.example.com/api',
		'https://grist.example.com/api/',
	])('normalizes %s the same way requests do', (url) => {
		const { authUrl, accessTokenUrl } = endpointsFor(url);
		const base = gristBaseUrl({ url });

		expect(authUrl).toBe(`${base}/oidc/auth`);
		expect(accessTokenUrl).toBe(`${base}/oidc/token`);
	});
});
