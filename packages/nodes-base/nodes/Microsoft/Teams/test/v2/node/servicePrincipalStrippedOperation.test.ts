import get from 'lodash/get';
import type { IExecuteFunctions, INode, INodeParameters, INodeProperties } from 'n8n-workflow';
import { NodeHelpers, UserError } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { createExecuteContext } from './helpers';
import { versionDescription } from '../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../v2/MicrosoftTeamsV2.node';
import { SERVICE_PRINCIPAL_AUTH } from '../../../v2/transport';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
		microsoftApiRequestAllItems: vi.fn(),
	};
});

const SP_UNSUPPORTED = /is not available with the Service Principal credential|are not available/;

/**
 * `Workflow` drops a hidden parameter before execution, so a parameter behind `SP_HIDE` is
 * absent at runtime. A read with no fallback then fails with `Could not get parameter "..."`,
 * and the user never sees why the Service Principal cannot do the thing they asked for.
 *
 * `servicePrincipal.test.ts` cannot see this: it drives `getNodeParameter` from a plain
 * object, which is the layer that does the stripping. This suite runs the real
 * `getNodeParameters` first and reads from the stripped result instead.
 */
describe('Microsoft Teams V2, Service Principal reads behind SP_HIDE', () => {
	let node: MicrosoftTeamsV2;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// The same call the `Workflow` constructor makes (packages/workflow/src/workflow.ts), so
	// these are the parameters the node really runs with.
	const asStoredByWorkflow = (stored: INodeParameters): INodeParameters =>
		NodeHelpers.getNodeParameters(
			versionDescription.properties,
			stored,
			true,
			false,
			mock<INode>({ typeVersion: 2 }),
			versionDescription,
		) as INodeParameters;

	// Mirrors NodeExecutionContext._getNodeParameter
	// (packages/core/src/execution-engine/node-execution-context/node-execution-context.ts:501),
	// which reads the stripped parameters and throws when a key is absent and the caller
	// passed no fallback. Re-check that source if this suite ever goes quiet.
	const contextOver = (parameters: INodeParameters): MockProxy<IExecuteFunctions> => {
		const ctx = createExecuteContext();
		ctx.getNodeParameter.mockImplementation((name: string, _i?: unknown, fallback?: unknown) => {
			const value = get(parameters, name, fallback);
			if (value === undefined) throw new UserError(`Could not get parameter "${name}"`);
			return value as never;
		});
		return ctx;
	};

	const expectGuardNotMissingParameter = async (stored: INodeParameters) => {
		const ctx = contextOver(asStoredByWorkflow(stored));

		await expect(node.execute.call(ctx)).rejects.toThrow(SP_UNSUPPORTED);
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
		expect(transport.microsoftApiRequestAllItems).not.toHaveBeenCalled();
	};

	describe('a resource whose operation selector is hidden', () => {
		// Derived, not listed. A new resource that hides its operation selector without a
		// matching entry in the router's guard map fails here instead of shipping.
		const operationSelectors = versionDescription.properties.filter(
			(property: INodeProperties) =>
				property.name === 'operation' &&
				property.displayOptions?.hide?.['/authentication']?.includes(SERVICE_PRINCIPAL_AUTH),
		);
		// `options` is a union; only the `INodePropertyOptions` arm carries `value`.
		const firstOperation = (selector: INodeProperties) => {
			const first = selector.options?.[0];
			return first && 'value' in first ? String(first.value) : '';
		};
		const cases = operationSelectors.flatMap((selector) =>
			((selector.displayOptions?.show?.resource ?? []) as string[]).map((resource) => ({
				resource,
				operation: firstOperation(selector),
			})),
		);

		it('finds the resources this suite is about', () => {
			expect(cases.map((c) => c.resource).sort()).toEqual([
				'chat',
				'chatMember',
				'chatMessage',
				'onlineMeeting',
			]);
		});

		it.each(cases)(
			'$resource:$operation names the credential, not the missing operation',
			async ({ resource, operation }) => {
				const parameters = asStoredByWorkflow({
					authentication: SERVICE_PRINCIPAL_AUTH,
					resource,
					operation,
				});
				// The premise. If this fails the resource guard can move back into the operation.
				expect(parameters.operation).toBeUndefined();

				await expectGuardNotMissingParameter({
					authentication: SERVICE_PRINCIPAL_AUTH,
					resource,
					operation,
				});
			},
		);
	});

	// channelMessage keeps its operation selector, because Get and Get Many do work app-only.
	// Only the send operations are hidden, field by field, so `contentType` and `message` are
	// the reads that go missing. Their guard runs first today; these rows keep it there.
	it.each([
		['create', { contentType: 'text', message: 'hi', options: {} }],
		['reply', { messageId: 'messageID', contentType: 'text', message: 'hi', options: {} }],
	])('channelMessage:%s names the credential, not a missing field', async (operation, fields) => {
		await expectGuardNotMissingParameter({
			authentication: SERVICE_PRINCIPAL_AUTH,
			resource: 'channelMessage',
			operation,
			teamId: { __rl: true, mode: 'id', value: 'teamID' },
			channelId: { __rl: true, mode: 'id', value: 'channelID' },
			...fields,
		});
	});
});
