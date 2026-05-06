import {
	codexBodySchema,
	communityNodeCodexFileSchema,
	NODE_FIELD_REGEX,
	nodeCodexFileSchema,
} from '../src/codex-file-schema';

describe('codex-file-schema', () => {
	describe('NODE_FIELD_REGEX', () => {
		it.each([
			['n8n-nodes-base.httpRequest'],
			['n8n-nodes-base.s3'],
			['n8n-nodes-base.gmailTrigger'],
			['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
			['n8n-nodes-acme.myNode'],
			['n8n-nodes-acme.aB'], // single-char tail after the leading letter
		])('accepts well-formed node identifier %s', (value) => {
			expect(NODE_FIELD_REGEX.test(value)).toBe(true);
		});

		it.each([
			[''],
			['NoDot'],
			['n8n-nodes-base.'], // missing identifier
			['n8n-nodes-base.1Bad'], // identifier must start with a letter
			['n8n-nodes-base.Has-Dash'], // dash inside identifier
			['n8n-nodes-base.has space'],
			['Bad-Casing.foo'], // package name lowercase only
			['@Scope/n8n-nodes-foo.bar'], // scope must be lowercase
			['n8n-nodes-base..foo'], // empty segment
		])('rejects malformed node identifier %s', (value) => {
			expect(NODE_FIELD_REGEX.test(value)).toBe(false);
		});
	});

	describe('nodeCodexFileSchema', () => {
		const validBuiltIn = {
			node: 'n8n-nodes-base.s3',
			nodeVersion: '1.0',
			codexVersion: '1.0',
			categories: ['Development', 'Data & Storage'],
			resources: {
				credentialDocumentation: [
					{ url: 'https://docs.n8n.io/integrations/builtin/credentials/s3/' },
				],
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.s3/',
					},
				],
			},
		} as const;

		it('accepts a clean built-in `.node.json` payload', () => {
			expect(nodeCodexFileSchema.safeParse(validBuiltIn).success).toBe(true);
		});

		it('accepts subcategories on the base profile', () => {
			const result = nodeCodexFileSchema.safeParse({
				...validBuiltIn,
				subcategories: { 'Core Nodes': ['Helpers', 'Flow'] },
			});
			expect(result.success).toBe(true);
		});

		it('accepts an optional `$schema` URL', () => {
			const result = nodeCodexFileSchema.safeParse({
				...validBuiltIn,
				$schema: 'https://cdn.jsdelivr.net/npm/n8n-workflow@2/schemas/node-codex-file.schema.json',
			});
			expect(result.success).toBe(true);
		});

		it.each(['node', 'nodeVersion', 'codexVersion'] as const)(
			'rejects when required field %s is missing',
			(missingField) => {
				const { [missingField]: _omitted, ...partial } = validBuiltIn;
				const result = nodeCodexFileSchema.safeParse(partial);
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues.some((issue) => issue.path[0] === missingField)).toBe(true);
				}
			},
		);

		it('rejects unknown top-level fields (e.g. `details`)', () => {
			const result = nodeCodexFileSchema.safeParse({
				...validBuiltIn,
				details: 'this field is silently dropped at runtime',
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(true);
			}
		});

		it('rejects the `aliases` typo (correct field is `alias`)', () => {
			const result = nodeCodexFileSchema.safeParse({
				...validBuiltIn,
				aliases: ['pause', 'sleep'],
			});
			expect(result.success).toBe(false);
		});

		it('rejects malformed `node` values that violate the regex', () => {
			const result = nodeCodexFileSchema.safeParse({
				...validBuiltIn,
				node: 'NotAValidPackageName',
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.some((issue) => issue.path[0] === 'node')).toBe(true);
			}
		});

		it('rejects malformed documentation URLs', () => {
			const result = nodeCodexFileSchema.safeParse({
				...validBuiltIn,
				resources: {
					primaryDocumentation: [{ url: 'not-a-url' }],
				},
			});
			expect(result.success).toBe(false);
		});

		it('rejects unknown keys inside `resources` (e.g. `generic`)', () => {
			const result = nodeCodexFileSchema.safeParse({
				...validBuiltIn,
				resources: {
					primaryDocumentation: [{ url: 'https://example.com/docs' }],
					generic: [{ url: 'https://example.com/blog' }],
				},
			});
			expect(result.success).toBe(false);
		});
	});

	describe('communityNodeCodexFileSchema', () => {
		const validCommunity = {
			node: 'n8n-nodes-acme.myNode',
			nodeVersion: '1.0',
			codexVersion: '1.0',
			categories: ['Communication'],
			resources: {
				primaryDocumentation: [{ url: 'https://example.com/docs' }],
			},
			alias: ['acme'],
		} as const;

		it('accepts a clean community `.node.json` payload', () => {
			const result = communityNodeCodexFileSchema.safeParse(validCommunity);
			expect(result.success).toBe(true);
		});

		it('rejects `subcategories` on the community profile', () => {
			const result = communityNodeCodexFileSchema.safeParse({
				...validCommunity,
				subcategories: { 'Core Nodes': ['Helpers'] },
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(
					result.error.issues.some(
						(issue) =>
							issue.code === 'unrecognized_keys' &&
							Array.isArray((issue as { keys?: unknown }).keys) &&
							(issue as { keys: string[] }).keys.includes('subcategories'),
					),
				).toBe(true);
			}
		});
	});

	describe('codexBodySchema', () => {
		it('accepts an empty body (all fields optional)', () => {
			expect(codexBodySchema.safeParse({}).success).toBe(true);
		});

		it('rejects unknown body fields', () => {
			expect(codexBodySchema.safeParse({ unknown: true }).success).toBe(false);
		});
	});
});
