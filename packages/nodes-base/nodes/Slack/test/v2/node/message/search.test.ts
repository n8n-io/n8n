import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	query: 'test in:test-002',
	messages: {
		total: 3,
		pagination: {
			total_count: 3,
			page: 1,
			per_page: 2,
			page_count: 1,
			first: 1,
			last: 3,
		},
		paging: {
			count: 2,
			total: 3,
			page: 1,
			pages: 1,
		},
		matches: [
			{
				iid: 'a60ff37e-5653-4c53-8a44-783ea4315476',
				team: 'T0364MSFHV2',
				score: 0,
				channel: {
					id: 'C08514ZPKB8',
					is_channel: true,
					is_group: false,
					is_im: false,
					is_mpim: false,
					is_shared: false,
					is_org_shared: false,
					is_ext_shared: false,
					is_private: false,
					name: 'test-002',
					pending_shared: [],
					is_pending_ext_shared: false,
				},
				type: 'message',
				user: 'U0362BXQYJW',
				username: 'michael.k',
				ts: '1734322597.935429',
				blocks: [
					{
						type: 'rich_text',
						block_id: '+bc',
						elements: [
							{
								type: 'rich_text_section',
								elements: [
									{
										type: 'text',
										text: 'test message\n',
									},
									{
										type: 'text',
										text: 'Automated with this ',
										style: {
											italic: true,
										},
									},
									{
										type: 'link',
										url: 'http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd',
										text: 'n8n workflow',
										style: {
											italic: true,
										},
									},
								],
							},
						],
					},
				],
				text: 'test message\n_Automated with this <http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd|n8n workflow>_',
				permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734322597935429',
				no_reactions: true,
			},
			{
				iid: '96ee0d2e-1a7d-40bf-b4b2-71ee15f004a8',
				team: 'T0364MSFHV2',
				score: 0,
				channel: {
					id: 'C08514ZPKB8',
					is_channel: true,
					is_group: false,
					is_im: false,
					is_mpim: false,
					is_shared: false,
					is_org_shared: false,
					is_ext_shared: false,
					is_private: false,
					name: 'test-002',
					pending_shared: [],
					is_pending_ext_shared: false,
				},
				type: 'message',
				user: 'U0362BXQYJW',
				username: 'michael.k',
				ts: '1734322341.161179',
				blocks: [
					{
						type: 'rich_text',
						block_id: 'FGAKN',
						elements: [
							{
								type: 'rich_text_section',
								elements: [
									{
										type: 'text',
										text: 'test message\n',
									},
									{
										type: 'text',
										text: 'Automated with this ',
										style: {
											italic: true,
										},
									},
									{
										type: 'link',
										url: 'http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd',
										text: 'n8n workflow',
										style: {
											italic: true,
										},
									},
								],
							},
						],
					},
				],
				text: 'test message\n_Automated with this <http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd|n8n workflow>_',
				permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734322341161179',
				no_reactions: true,
			},
			{
				iid: '72f79902-65f7-4bf3-b64b-3fd0b0c3746c',
				team: 'T0364MSFHV2',
				score: 0,
				channel: {
					id: 'C08514ZPKB8',
					is_channel: true,
					is_group: false,
					is_im: false,
					is_mpim: false,
					is_shared: false,
					is_org_shared: false,
					is_ext_shared: false,
					is_private: false,
					name: 'test-002',
					pending_shared: [],
					is_pending_ext_shared: false,
				},
				type: 'message',
				user: 'U0362BXQYJW',
				username: 'michael.k',
				ts: '1734321960.507649',
				blocks: [
					{
						type: 'rich_text',
						block_id: 'fnjm',
						elements: [
							{
								type: 'rich_text_section',
								elements: [
									{
										type: 'text',
										text: 'test message\n',
									},
									{
										type: 'text',
										text: 'Automated with this ',
										style: {
											italic: true,
										},
									},
									{
										type: 'link',
										url: 'http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd',
										text: 'n8n workflow',
										style: {
											italic: true,
										},
									},
								],
							},
						],
					},
				],
				text: 'test message\n_Automated with this <http://localhost:5678/workflow/qJdEfiBgYLdfYOTs?utm_source=n8n-internal&amp;utm_medium=powered_by&amp;utm_campaign=n8n-nodes-base.slack_be251a83c052a9862eeac953816fbb1464f89dfbf79d7ac490a8e336a8cc8bfd|n8n workflow>_',
				permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734321960507649',
				no_reactions: true,
			},
		],
	},
};

describe('Test SlackV2, message => search', () => {
	nock('https://slack.com')
		.post('/api/search.messages?query=test%20in%3Atest-002&sort=timestamp&sort_dir=desc&count=2')
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['search.workflow.json'],
	});
});
