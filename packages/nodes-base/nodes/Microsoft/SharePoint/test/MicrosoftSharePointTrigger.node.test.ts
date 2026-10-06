import { readFileSync } from 'fs';
import type { INode, INodePropertyOptions, IPollFunctions } from 'n8n-workflow';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { MicrosoftSharePointTrigger } from '../MicrosoftSharePointTrigger.node';
import { getDrives } from '../drive';
import { getSites } from '../site';
import { microsoftApiRequest, SERVICE_PRINCIPAL_AUTH } from '../transport';

describe('Microsoft SharePoint Trigger', () => {
	const { description } = new MicrosoftSharePointTrigger();

	it.each([
		['displayName', 'Microsoft SharePoint Trigger'],
		// Saved workflows resolve by type name, so this one can never change.
		['name', 'microsoftSharePointTrigger'],
		['version', 1],
	] as const)('declares %s as %s', (key, expected) => {
		expect(description[key]).toBe(expected);
	});

	it('is a polling trigger with no input', () => {
		expect(description.group).toEqual(['trigger']);
		expect(description.polling).toBe(true);
		expect(description.inputs).toEqual([]);
		expect(description.outputs).toEqual(['main']);
	});

	it('stays out of the node picker until the trigger is finished', () => {
		expect(description.hidden).toBe(true);
	});

	it('declares its own credential pair, independent of the action node', () => {
		expect(description.credentials?.map((c) => c.name)).toEqual([
			'microsoftOAuth2Api',
			SERVICE_PRINCIPAL_AUTH,
		]);
	});

	it('leads with an authentication selector defaulting to the delegated credential', () => {
		const auth = description.properties[0];

		expect(auth.name).toBe('authentication');
		expect(auth.type).toBe('options');
		expect(auth.noDataExpression).toBe(true);
		expect(auth.default).toBe('microsoftOAuth2Api');
		expect((auth.options ?? []).map((o) => ('value' in o ? o.value : undefined))).toEqual([
			'microsoftOAuth2Api',
			SERVICE_PRINCIPAL_AUTH,
		]);
	});

	it.each(['microsoftOAuth2Api', SERVICE_PRINCIPAL_AUTH])(
		'gates the %s credential behind its own authentication value',
		(name) => {
			const credential = description.credentials?.find((c) => c.name === name);

			expect(credential?.required).toBe(true);
			expect(credential?.displayOptions?.show?.authentication).toEqual([name]);
		},
	);

	it('does not offer the legacy SharePoint credential, whose tokens cannot reach Graph', () => {
		expect(description.credentials?.map((c) => c.name)).not.toContain(
			'microsoftSharePointOAuth2Api',
		);
	});

	it('emits nothing until the poll is implemented', async () => {
		expect(await new MicrosoftSharePointTrigger().poll.call(mock<IPollFunctions>())).toBeNull();
	});

	it('ships a codex whose filename the loader can derive', () => {
		// directory-loader appends "on" to the compiled .js path, so the codex has
		// to match the node filename exactly. The action node's does not, and its
		// codex is silently absent on a case-sensitive filesystem.
		const codex = JSON.parse(
			readFileSync(join(__dirname, '..', 'MicrosoftSharePointTrigger.node.json'), 'utf8'),
		) as { node: string };

		expect(codex.node).toBe('n8n-nodes-base.microsoftSharePointTrigger');
	});

	describe('selection', () => {
		const locator = (name: string) => description.properties.find((p) => p.name === name);
		const modeNames = (name: string) => locator(name)?.modes?.map((m) => m.name);
		const validationOf = (name: string, mode: string) => {
			const found = locator(name)?.modes?.find((m) => m.name === mode);
			const rule = found && 'validation' in found ? found.validation?.[0] : undefined;
			return rule && 'properties' in rule
				? (rule.properties as { regex: string }).regex
				: undefined;
		};

		it.each([
			['site', ['list', 'url', 'id'], 'getSites'],
			['drive', ['list', 'id'], 'getDrives'],
		])('offers %s with a picker and a typed fallback', (name, modes, method) => {
			expect(modeNames(name)).toEqual(modes);
			const list = locator(name)?.modes?.find((m) => m.name === 'list');
			expect(list?.typeOptions?.searchListMethod).toBe(method);
		});

		it('registers both pickers on the node', () => {
			const { methods } = new MicrosoftSharePointTrigger();

			expect(methods.listSearch.getSites).toBe(getSites);
			expect(methods.listSearch.getDrives).toBe(getDrives);
		});

		it('hides the library until a site is chosen', () => {
			expect(locator('drive')?.displayOptions?.hide?.site).toEqual(['']);
			expect(locator('drive')?.typeOptions?.loadOptionsDependsOn).toEqual(['site.value']);
		});

		it.each([
			['b!zXyF9kabcdef-1234567890', true],
			['01BYE5RZ6QN3ZWBTUFOFD3GSPGOHDJD36K', true],
			// A bare GUID is a list ID in the wrong field
			['58a279af-1f06-4392-a5ed-2b37fa1d6c1d', false],
			['58A279AF-1F06-4392-A5ED-2B37FA1D6C1D', false],
			// Only a bare one. A drive ID that merely starts GUID-shaped is fine.
			['58a279af-1f06-4392-a5ed-2b37fa1d6c1dXYZ', true],
		])('drive ID %s accepted: %s', (value, accepted) => {
			const pattern = new RegExp(validationOf('drive', 'id') as string);

			expect(pattern.test(value)).toBe(accepted);
		});
	});

	describe('events', () => {
		const events = description.properties.find((p) => p.name === 'events');
		const optionOf = (value: string) =>
			(events?.options ?? []).find((o) => 'value' in o && o.value === value) as
				| INodePropertyOptions
				| undefined;

		it('offers exactly Changed and Deleted, both on by default', () => {
			expect(events?.type).toBe('multiOptions');
			expect(events?.required).toBe(true);
			expect(
				(events?.options ?? []).map((o) => ('value' in o ? [o.name, o.value] : undefined)),
			).toEqual([
				['Changed', 'changed'],
				['Deleted', 'deleted'],
			]);
			expect(events?.default).toEqual(['changed', 'deleted']);
		});

		it('warns that Changed cannot separate a new file from an edited one', () => {
			expect(optionOf('changed')?.description).toMatch(/latest state/i);
		});

		it('warns that a deletion entry carries almost nothing', () => {
			expect(optionOf('deleted')?.description).toMatch(/little beyond the ID/i);
		});

		it.each([
			// The loader prepends pollTimes to every polling node, so declaring one
			// here would show the user two copies of the same field.
			'pollTimes',
			// Entries are emitted as the feed sends them, so there is no shape to pick.
			'simplify',
			// Graph cannot narrow either delta feed below the library root.
			'folder',
		])('declares no %s property', (name) => {
			expect(description.properties.map((p) => p.name)).not.toContain(name);
		});

		it('promises no path field, which the drive delta feed never sends', () => {
			const texts = description.properties.flatMap((property) => [
				property.description ?? '',
				...(property.options ?? []).map((option) =>
					'description' in option ? (option.description ?? '') : '',
				),
			]);

			expect(texts.filter((text) => /\bpath\b/i.test(text))).toEqual([]);
		});
	});

	describe('authenticating a poll', () => {
		const pollContext = (authentication?: string) => {
			const ctx = mock<IPollFunctions>();
			ctx.getNode.mockReturnValue(mock<INode>());
			ctx.getNodeParameter.mockImplementation(
				(name: string, fallback?: unknown) =>
					(name === 'authentication' ? (authentication ?? fallback) : fallback) as never,
			);
			ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: 'https://graph.microsoft.com' });
			return ctx;
		};

		it.each([
			['microsoftOAuth2Api', 'requestOAuth2'],
			[SERVICE_PRINCIPAL_AUTH, 'requestWithAuthentication'],
		] as const)('sends a %s poll through %s', async (authentication, helper) => {
			const ctx = pollContext(authentication);
			const send = vi.fn().mockResolvedValue({ value: [] });
			ctx.helpers[helper] = send;

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/root');

			expect(send).toHaveBeenCalledTimes(1);
			expect(ctx.getCredentials).toHaveBeenCalledWith(authentication);
		});

		it.each([
			[
				'microsoftOAuth2Api',
				'requestOAuth2',
				'the signed-in account may not have access to this resource',
			],
			[
				SERVICE_PRINCIPAL_AUTH,
				'requestWithAuthentication',
				'missing a consented application permission',
			],
		] as const)('explains a 403 in %s terms', async (authentication, helper, wording) => {
			const ctx = pollContext(authentication);
			ctx.helpers[helper] = vi
				.fn()
				.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }));

			await expect(microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/root')).rejects.toMatchObject({
				httpCode: '403',
				message: expect.stringContaining(wording),
			});
		});

		it('falls back to the delegated credential when reading the parameter throws', async () => {
			const ctx = pollContext();
			ctx.getNodeParameter.mockImplementation(() => {
				throw new Error('Could not get parameter');
			});
			const send = vi.fn().mockResolvedValue({ value: [] });
			ctx.helpers.requestOAuth2 = send;

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/root');

			expect(ctx.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
		});

		it('falls back to the delegated credential when no authentication is set', async () => {
			const ctx = pollContext();
			const send = vi.fn().mockResolvedValue({ value: [] });
			ctx.helpers.requestOAuth2 = send;

			await microsoftApiRequest.call(ctx, 'GET', '/v1.0/sites/root');

			expect(ctx.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
		});
	});
});
