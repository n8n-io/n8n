import { Container } from '@n8n/di';
import { buildHitlCallbackReference, InstanceSettings } from 'n8n-core';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { SlackV2 } from '../../nodes/Slack/V2/SlackV2.node';
import { Telegram } from '../../nodes/Telegram/Telegram.node';
import { DiscordV2 } from '../../nodes/Discord/v2/DiscordV2.node';
import { versionDescription } from '../../nodes/Discord/v2/actions/versionDescription';
import { mock } from 'vitest-mock-extended';
import { createSendAndWaitMessageBody as slackMessage } from '../../nodes/Slack/V2/GenericFunctions';
import { createSendAndWaitMessageBody as telegramMessage } from '../../nodes/Telegram/GenericFunctions';
import { createSendAndWaitMessageBody as discordMessage } from '../../nodes/Discord/v2/helpers/utils';

const secret = 'test-native-approval-secret';
beforeEach(() =>
	Container.set(InstanceSettings, mock<InstanceSettings>({ hmacSignatureSecret: secret })),
);
afterEach(() => Container.reset());

it.each([
	['Slack', slackMessage],
	['Telegram', telegramMessage],
	['Discord', discordMessage],
] as const)(
	'uses native %s callbacks for Agent approval and keeps normal workflow links',
	(_platform, build) => {
		const context = mock<IExecuteFunctions>();
		const node = mock<INode>({
			id: 'approval',
			typeVersion: 2.2,
			parameters: { agentApproval: true },
		});
		context.getNode.mockReturnValue(node);
		context.getExecutionId.mockReturnValue('123');
		context.getSignedResumeUrl.mockReturnValue('https://example.com/webhook-waiting/123');
		context.getNodeParameter.mockImplementation((name) => {
			if (name === 'message') return 'Approval required';
			if (name === 'subject') return '';
			if (name === 'responseType') return 'approval';
			if (name === 'select') return 'channel';
			if (name === 'channelId' || name === 'chatId') return 'C1';
			if (name === 'options') return { appendAttribution: false };
			if (name === 'approvalOptions.values')
				return { approvalType: 'double', approveLabel: 'Approve', disapproveLabel: 'Deny' };
			return false;
		});
		const native = JSON.stringify(build(context));
		for (const decision of ['a', 'd'] as const) {
			const reference = buildHitlCallbackReference('123', decision, secret);
			expect(native).toContain(reference);
			expect(Buffer.byteLength(reference)).toBeLessThanOrEqual(64);
		}
		expect(native).not.toContain('"url"');
		expect(native).toContain('Approve');
		expect(native).toContain('Deny');
		expect(native).not.toContain('session');

		node.parameters.agentApproval = false;
		const ordinary = JSON.stringify(build(context));
		expect(ordinary).toContain('"url":"https://example.com/webhook-waiting/123"');
		expect(ordinary).not.toContain('nhitl1|');
	},
);

it.each([
	new SlackV2({ name: 'Slack', displayName: 'Slack', description: 'Slack', group: ['output'] })
		.description,
	new Telegram().description,
	new DiscordV2(versionDescription).description,
])(
	'preserves the callback setting when $displayName workflow parameters are normalized',
	(description) => {
		const node = mock<INode>({
			typeVersion: 1,
			parameters: {
				authentication: 'botToken',
				resource: 'message',
				operation: 'sendAndWait',
				responseType: 'approval',
				agentApproval: true,
			},
		});
		const parameters = NodeHelpers.getNodeParameters(
			description.properties,
			node.parameters,
			true,
			false,
			node,
			description,
		);
		expect(parameters?.agentApproval).toBe(true);
	},
);
