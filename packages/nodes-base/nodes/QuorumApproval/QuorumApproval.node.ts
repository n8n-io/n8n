import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, requestPath } from 'n8n-workflow';

import {
	CHANNEL_NAMES,
	CHANNELS,
	parseApprovers,
	resolveRequired,
	type ApprovalsRequired,
	type Approver,
	type Channel,
} from './approvers';
import { sendApprovalRequest } from './channels';
import { quorumApprovalProperties } from './descriptions';
import {
	formatUserLabel,
	slackApiRequestAllItemsWithRateLimit,
} from '../Slack/V2/GenericFunctions';
import { configureWaitTillDate } from '../../utils/sendAndWait/configureWaitTillDate.util';

const APPROVERS = '($parameter.approvers?.approver ?? [])';

/** The credential that each channel needs. Slack's depends on the Slack authentication. */
function credentialTypeFor(context: IExecuteFunctions, channel: Channel): string {
	if (channel === 'email') return 'smtp';
	if (channel === 'telegram') return 'telegramApi';
	return context.getNodeParameter('authentication', 0, 'accessToken') === 'oAuth2'
		? 'slackOAuth2Api'
		: 'slackApi';
}

const isChannel = (value: unknown): value is Channel =>
	typeof value === 'string' && (CHANNELS as readonly string[]).includes(value);

/** Fails before anything is sent when a channel in use has no credential. */
async function assertCredentials(context: IExecuteFunctions, approvers: Approver[]): Promise<void> {
	for (const channel of new Set(approvers.map((approver) => approver.channel))) {
		try {
			await context.getCredentials(credentialTypeFor(context, channel));
		} catch {
			const user = approvers.find((approver) => approver.channel === channel);
			throw new NodeOperationError(
				context.getNode(),
				`Add a ${CHANNEL_NAMES[channel]} credential. '${user?.name ?? ''}' uses ${CHANNEL_NAMES[channel]}.`,
			);
		}
	}
}

export class QuorumApproval implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Quorum Approval',
		name: 'quorumApproval',
		icon: 'fa:user-check',
		iconColor: 'dark-green',
		group: ['organization'],
		version: 1,
		description: 'Ask several approvers and continue when enough of them approve',
		subtitle: '={{ ' + APPROVERS + '.length + " approvers" }}',
		defaults: { name: 'Quorum Approval' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['Approved', 'Declined', 'Timed out'],
		waitingNodeTooltip: 'Execution will continue after enough approvers respond',
		credentials: [
			{
				name: 'slackApi',
				required: true,
				displayOptions: { show: { channels: ['slack'], authentication: ['accessToken'] } },
			},
			{
				name: 'slackOAuth2Api',
				required: true,
				displayOptions: { show: { channels: ['slack'], authentication: ['oAuth2'] } },
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 'smtp',
				required: true,
				displayOptions: { show: { channels: ['email'] } },
			},
			{ name: 'telegramApi', required: true, displayOptions: { show: { channels: ['telegram'] } } },
		],
		hints: [
			{
				message: 'Approvals required is more than the number of approvers',
				type: 'warning',
				location: 'ndv',
				whenToDisplay: 'always',
				displayCondition: `={{ $parameter.approvalsRequired === "custom" && $parameter.customRequired > ${APPROVERS}.length }}`,
			},
			{
				message: 'An approver uses a channel that is not in Channels',
				type: 'warning',
				location: 'ndv',
				whenToDisplay: 'always',
				displayCondition: `={{ ${APPROVERS}.some((approver) => !($parameter.channels ?? []).includes(approver.channel)) }}`,
			},
			{
				message:
					'Two approvers have the same channel and recipient. Each one counts as a separate approver.',
				type: 'warning',
				location: 'ndv',
				whenToDisplay: 'always',
				displayCondition: `={{ (() => { const keys = ${APPROVERS}.map((approver) => [approver.channel, approver.email, approver.chatId, approver.slackTarget === "channel" ? approver.slackChannel?.value : approver.slackUser?.value].join("|")); return new Set(keys).size !== keys.length; })() }}`,
			},
		],
		properties: quorumApprovalProperties,
	};

	methods = {
		listSearch: {
			async getSlackUsers(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const { data, cursor } = await slackApiRequestAllItemsWithRateLimit<{
					id: string;
					name: string;
					real_name?: string;
				}>(
					this,
					'members',
					'GET',
					requestPath`/users.list`,
					{},
					{ limit: 200, cursor: paginationToken },
					{ onFail: 'stop', maxRetries: 2, fallbackDelay: 30_000 },
				);
				const results = data
					.map((user) => ({ name: formatUserLabel(user), value: user.id }))
					.filter(({ name }) => !filter || name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => a.name.localeCompare(b.name));
				return { results, paginationToken: cursor };
			},
			async getSlackChannels(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const { data, cursor } = await slackApiRequestAllItemsWithRateLimit<{
					id: string;
					name: string;
				}>(
					this,
					'channels',
					'GET',
					requestPath`/conversations.list`,
					{},
					{ types: 'public_channel,private_channel', limit: 1000, cursor: paginationToken },
					{ onFail: 'stop', maxRetries: 2, fallbackDelay: 30_000 },
				);
				const results = data
					.map((channel) => ({ name: channel.name, value: channel.id }))
					.filter(({ name }) => !filter || name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => a.name.localeCompare(b.name));
				return { results, paginationToken: cursor };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const node = this.getNode();
		const channels = (this.getNodeParameter('channels', 0, []) as unknown[]).filter(isChannel);
		const approvers = parseApprovers(
			node,
			this.getNodeParameter('approvers.approver', 0, []),
			channels,
		);
		const required = resolveRequired(
			node,
			this.getNodeParameter('approvalsRequired', 0, 'majority') as ApprovalsRequired,
			this.getNodeParameter('customRequired', 0, 1) as number,
			approvers.length,
		);
		const allowDecline = this.getNodeParameter('approvalType', 0, 'double') === 'double';
		const usesEmail = approvers.some((approver) => approver.channel === 'email');
		const message = this.getNodeParameter('message', 0, '') as string;
		const subject = usesEmail ? (this.getNodeParameter('subject', 0, '') as string) : '';
		const fromEmail = usesEmail ? (this.getNodeParameter('fromEmail', 0, '') as string) : '';
		const waitTill = configureWaitTillDate(this);

		await assertCredentials(this, approvers);

		// Before any send: engine v1 refuses a ballot here, so no approver gets a
		// request that nothing can count.
		const voters: IDataObject[] = approvers.map(({ name, channel }) => ({
			approver: name,
			channel,
		}));
		await this.putExecutionToWait(waitTill, { ballot: { voters, required, allowDecline } });

		for (const [index, approver] of approvers.entries()) {
			const voter = String(index);
			try {
				await sendApprovalRequest.call(this, approver, {
					subject,
					message: approver.messageOverride ?? message,
					fromEmail,
					approveUrl: this.getSignedResumeUrl({ vote: 'a', voter }),
					...(allowDecline ? { declineUrl: this.getSignedResumeUrl({ vote: 'd', voter }) } : {}),
				});
			} catch (error) {
				throw new NodeOperationError(
					node,
					`Couldn't send the approval request to '${approver.name}' (${CHANNEL_NAMES[approver.channel]}): ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		return [this.getInputData()];
	}
}
