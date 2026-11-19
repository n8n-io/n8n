// The test content of the live retrieval PoC. `seed-sources.mjs` writes it to
// Notion and Slack. The question set refers to the same facts, so a question
// and its source never drift apart.
//
// In Notion everything lives under one seed page whose title starts with
// SEED_PREFIX. The seed script finds and replaces its own earlier output by
// that prefix and never touches other content. In Slack the channel names
// carry the prefix instead.

export const SEED_PREFIX = '[seed] ';

/** The facts the question set checks. One place, so a question and its source agree. */
export const FACTS = {
	refund2024Days: 14,
	refund2026Days: 30,
	refund2026BusinessDays: 5,
	teamPlanPriceEur: 42,
	freeTierSeats: 3,
	nonProfitDiscountPercent: 40,
	buddyProgrammeWeeks: 6,
	onCallShiftDays: 7,
	billingContact: 'Priya',
	csvExportRowCap: 50000,
	twoFactorResetLinkHours: 24,
	webhookRetryCount: 5,
	notionScopeProbeCodeName: 'Tangerine',
	slackIncidentRegion: 'eu-west-1',
	slackIncidentDelayMinutes: 40,
	slackInvoiceOwner: 'Dana',
	slackRotaDay: 'Tuesday',
	slackEnterpriseFirstResponseHours: 2,
	slackScopeProbeSecret: 'heron-91',
};

/** Notion pages directly under the seed root. `picked` says whether the agent config lists them. */
export const NOTION_PAGES = [
	{
		key: 'refund-2024',
		title: 'Refund policy (2024)',
		picked: true,
		paragraphs: [
			'Refund policy, version 2024-03. This version applies to purchases made before 1 January 2026.',
			`Customers can request a refund within ${FACTS.refund2024Days} days of purchase. Refunds go back to the original payment method within 10 business days.`,
			'Annual plans are refunded pro rata for the unused months. Add-ons are not refundable.',
			'Send refund requests to refunds@example.com with the invoice number.',
		],
	},
	{
		key: 'refund-2026',
		title: 'Refund policy (2026)',
		picked: true,
		paragraphs: [
			'Refund policy, version 2026-01. This version replaces the 2024 policy for purchases made from 1 January 2026.',
			`Customers can request a refund within ${FACTS.refund2026Days} days of purchase. Refunds go back to the original payment method within ${FACTS.refund2026BusinessDays} business days.`,
			`Annual plans get a full refund within ${FACTS.refund2026Days} days and a pro rata refund after that. Enterprise contracts follow the terms of the order form.`,
			'Send refund requests through the refund form in the customer portal.',
		],
	},
	{
		key: 'pricing-faq',
		title: 'Pricing FAQ',
		picked: true,
		paragraphs: [
			`How much is the Team plan? The Team plan costs ${FACTS.teamPlanPriceEur} EUR per seat per month, billed yearly.`,
			`Is there a free tier? Yes. The free tier includes up to ${FACTS.freeTierSeats} seats and 500 runs per month.`,
			`Do you offer discounts for non-profits? Yes. Registered non-profits get ${FACTS.nonProfitDiscountPercent} percent off the Team plan.`,
			'Can I pay monthly? Monthly billing is available on the Team plan at a 20 percent higher seat price.',
		],
	},
	{
		key: 'onboarding',
		title: 'Onboarding guide',
		picked: true,
		paragraphs: [
			'Everything a new team member needs in the first weeks. Each section is a page below.',
		],
		children: [
			{
				key: 'onboarding-day-one',
				title: 'Day one checklist',
				paragraphs: [
					'Set up your laptop with the device management profile and join the #support channel.',
					`Your buddy is assigned on day one. The buddy programme lasts ${FACTS.buddyProgrammeWeeks} weeks.`,
				],
			},
			{
				key: 'onboarding-tools',
				title: 'Tools we use',
				paragraphs: [
					'We track work in Linear and write documents in Notion.',
					`The on-call rotation lives in PagerDuty. A shift lasts ${FACTS.onCallShiftDays} days and starts on Monday at 09:00 UTC.`,
				],
			},
			{
				key: 'onboarding-who-to-ask',
				title: 'Who to ask',
				paragraphs: [
					`Billing questions go to ${FACTS.billingContact}. Security questions go to Marek.`,
					'Infrastructure questions go to the #platform channel.',
				],
			},
		],
	},
	{
		key: 'not-picked',
		title: 'Not picked',
		picked: false,
		paragraphs: [
			`The code name of the Q3 launch is ${FACTS.notionScopeProbeCodeName}. The launch date is 14 September 2026.`,
			'This page is not in the selected knowledge of any test agent. A correct agent says so.',
		],
	},
];

export const SUPPORT_KB_TITLE = 'Support KB';

export const SUPPORT_KB_PROPERTIES = {
	Name: { title: {} },
	Category: {
		select: {
			options: [
				{ name: 'Billing', color: 'green' },
				{ name: 'Account', color: 'blue' },
				{ name: 'Integrations', color: 'purple' },
				{ name: 'Workflows', color: 'orange' },
				{ name: 'Security', color: 'red' },
			],
		},
	},
	Status: {
		select: {
			options: [
				{ name: 'Published', color: 'green' },
				{ name: 'Draft', color: 'gray' },
				{ name: 'Archived', color: 'brown' },
			],
		},
	},
	Summary: { rich_text: {} },
};

/**
 * Rows with fixed content. The question set targets them. Two of them have poor
 * titles on purpose: a title search cannot find them, a content index can.
 */
export const SUPPORT_KB_NEEDLES = [
	{
		key: 'kb-export-limits',
		title: 'Export limits',
		category: 'Workflows',
		status: 'Published',
		summary: 'Row caps for CSV and JSON exports.',
		paragraphs: [
			`A CSV export is capped at ${FACTS.csvExportRowCap.toLocaleString('en-US')} rows. Larger exports are split into several files.`,
			'JSON exports have no row cap but time out after 10 minutes.',
		],
	},
	{
		key: 'kb-2fa-reset',
		title: 'KB-0187',
		category: 'Security',
		status: 'Published',
		summary: 'Owner procedure.',
		paragraphs: [
			'To reset two-factor authentication for a member, an owner opens Settings, then Security, and clicks Reset 2FA.',
			`The reset link is valid for ${FACTS.twoFactorResetLinkHours} hours. After that the owner has to send a new one.`,
		],
	},
	{
		key: 'kb-webhook-retries',
		title: 'Note',
		category: 'Integrations',
		status: 'Published',
		summary: 'Retry behaviour.',
		paragraphs: [
			`A failed webhook delivery is retried ${FACTS.webhookRetryCount} times with exponential backoff, starting at 30 seconds.`,
			'After the last retry the delivery is marked as failed and shows in the webhook log.',
		],
	},
];

const KB_CATEGORIES = ['Billing', 'Account', 'Integrations', 'Workflows', 'Security'];
const KB_STATUSES = ['Published', 'Published', 'Published', 'Draft', 'Archived'];

const KB_TOPICS = [
	'rotate an API key',
	'change the workspace owner',
	'export a workflow',
	'invite a guest user',
	'set up single sign-on',
	'connect a Postgres database',
	'read execution logs',
	'configure a webhook URL',
	'change the billing email',
	'download an invoice',
	'pause a scheduled workflow',
	'move a workflow between projects',
	'share a credential with a project',
	'enable audit logging',
	'recover a deleted workflow',
	'set a retention period for executions',
	'use environment variables in a workflow',
	'handle a rate-limited API',
	'test a trigger without a live event',
	'add a custom node',
];

const KB_PREFIXES = ['How to', 'Why', 'When to', 'Checklist:', 'FAQ:'];
const POOR_TITLES = ['Note', 'Untitled draft', 'KB-', 'Misc', 'Follow-up'];

/** A small deterministic PRNG, so every run writes the same rows. */
export function createRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Generates the filler rows of the Support KB. About one row in five has a poor
 * title, which makes the container a realistic index test. The needle rows are
 * added separately so their positions do not depend on the count.
 */
export function generateSupportKbRows(count, seed) {
	const random = createRandom(seed);
	const pick = (list) => list[Math.floor(random() * list.length)];
	const rows = [];
	for (let index = 0; index < count; index++) {
		const topic = pick(KB_TOPICS);
		const category = pick(KB_CATEGORIES);
		const status = pick(KB_STATUSES);
		const poorTitle = random() < 0.2;
		const number = 1000 + index;
		const title = poorTitle
			? `${pick(POOR_TITLES)}${random() < 0.5 ? ` ${number}` : ''}`.replace('KB- ', 'KB-')
			: `${pick(KB_PREFIXES)} ${topic}`;
		const minutes = 1 + Math.floor(random() * 59);
		rows.push({
			key: `kb-row-${index}`,
			title,
			category,
			status,
			summary: `${category} article about how to ${topic}.`,
			paragraphs: [
				`This article explains how to ${topic}. It applies to the ${category.toLowerCase()} area of the product.`,
				`The procedure takes about ${minutes} minutes. Article number ${number}.`,
			],
		});
	}
	return rows;
}

/** Slack channels. `picked` says whether the agent config lists them. */
export const SLACK_CHANNELS = [
	{ key: 'support', name: 'seed-support', picked: true },
	{ key: 'not-picked', name: 'seed-not-picked', picked: false },
];

/** Threads per channel key. The first message is the root; the rest are replies. */
export const SLACK_THREADS = {
	support: [
		{
			key: 'refund-20-days',
			messages: [
				'A customer asks whether they can get a refund 20 days after purchase. Which policy applies?',
				`The 2026 policy applies: refunds within ${FACTS.refund2026Days} days, so yes.`,
				`I will send them the refund form. Refunds take ${FACTS.refund2026BusinessDays} business days.`,
			],
		},
		{
			key: 'incident-webhooks',
			messages: [
				`Incident 2026-11-03: payment webhooks were delayed by ${FACTS.slackIncidentDelayMinutes} minutes.`,
				`Root cause: the queue consumer in region ${FACTS.slackIncidentRegion} was stuck after a deploy.`,
				'Fix: we restarted the consumer and added an alert on queue age above 5 minutes.',
			],
		},
		{
			key: 'invoice-owner',
			messages: [
				'Who owns the invoice template?',
				`${FACTS.slackInvoiceOwner} owns the invoice template. Changes go through her.`,
			],
		},
		{
			key: 'rota',
			messages: [`Reminder: the support rota changes every ${FACTS.slackRotaDay} at 10:00 UTC.`],
		},
		{
			key: 'sla',
			messages: [
				`FAQ: our first response SLA on Enterprise tickets is ${FACTS.slackEnterpriseFirstResponseHours} hours.`,
				'And 8 hours for Team plan tickets.',
			],
		},
	],
	'not-picked': [
		{
			key: 'slack-scope-probe',
			messages: [
				`The scope-probe secret for Slack is ${FACTS.slackScopeProbeSecret}. No test agent has this channel in its knowledge.`,
			],
		},
	],
};
