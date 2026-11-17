/*
 * Self-check of the pure dependency check engine (LIGO-1159 proof of concept).
 * This is not a test file. It feeds fact fixtures for the main scenarios of the specification
 * into the engine and prints the reports.
 *
 * Run from the repository root:
 *   ./node_modules/.pnpm/node_modules/.bin/tsx spike/ligo-1159/poc/dependency-check-selfcheck.ts
 * Add `--verbose` to print each report as JSON.
 */
import type { PromotionDependencyReport } from '@n8n/api-types';

import {
	computeApplyOutcome,
	computeApplyReport,
} from '../../../packages/cli/src/modules/promotions.ee/dependency-check/apply-report';
import type {
	AccessFact,
	ApplyCheckInput,
	BranchFact,
	FactProject,
	PlanFact,
	PromoteCheckInput,
	ReferenceFact,
	SourceTargetFact,
} from '../../../packages/cli/src/modules/promotions.ee/dependency-check/dependency-check.types';
import {
	renderGapsForCommitMessage,
	requirementReasons,
	verifyConfirmedGaps,
} from '../../../packages/cli/src/modules/promotions.ee/dependency-check/gap-confirmation';
import { computePromoteReport } from '../../../packages/cli/src/modules/promotions.ee/dependency-check/promote-report';

const verbose = process.argv.includes('--verbose');
let failures = 0;

// --- The cast of the specification.
const SALES: FactProject = { id: 'p-sales', name: 'Sales', kind: 'team' };
const PLATFORM: FactProject = { id: 'p-platform', name: 'Platform', kind: 'team' };
const OPS: FactProject = { id: 'p-ops', name: 'Ops', kind: 'team' };
const SUPPORT: FactProject = { id: 'p-support', name: 'Support', kind: 'team' };
const ALICE: FactProject = { id: 'p-alice', name: 'Alice', kind: 'personal' };
const PROJECTS = Object.fromEntries(
	[SALES, PLATFORM, OPS, SUPPORT, ALICE].map((project) => [project.id, project]),
);

const syncOrders = { id: 'wf-sync', name: 'Sync orders', projectId: SALES.id };
const dailyReport = { id: 'wf-daily', name: 'Daily report', projectId: SALES.id };

const usesCrmKey = (consumer = syncOrders): ReferenceFact => ({
	consumer,
	target: { kind: 'credential', id: 'cred-crm', name: 'CRM key', credentialType: 'crmApi' },
	usage: 'credential',
});
const callsNotify = (consumer = syncOrders): ReferenceFact => ({
	consumer,
	target: { kind: 'workflow', id: 'wf-notify', name: 'Notify on-call' },
	usage: 'sub-workflow',
});

const crmOnSource = (over: Partial<SourceTargetFact> = {}): SourceTargetFact => ({
	exists: true,
	name: 'CRM key (real name)',
	credentialType: 'crmApi',
	project: PLATFORM,
	usageScope: 'project',
	canRead: true,
	usableBy: { [syncOrders.id]: true, [dailyReport.id]: true },
	...over,
});
const notifyOnSource = (over: Partial<SourceTargetFact> = {}): SourceTargetFact => ({
	exists: true,
	name: 'Notify on-call',
	project: OPS,
	canRead: true,
	usableBy: { [syncOrders.id]: true },
	...over,
});

const emptyBranch = (over: Partial<BranchFact> = {}): BranchFact => ({
	credentialFolders: {},
	credentials: {},
	topLevelCredentialIds: [],
	workflows: {},
	requirements: {},
	projects: { [SALES.id]: SALES, [PLATFORM.id]: PLATFORM, [OPS.id]: OPS },
	...over,
});

const plan = (over: Partial<PlanFact> = {}): PlanFact => ({
	writtenWorkflows: { [syncOrders.id]: SALES.id },
	writtenCredentials: {},
	deletedWorkflows: [],
	projectOrder: [SALES.id, PLATFORM.id, OPS.id],
	...over,
});

const access = (projects: FactProject[], over: Partial<AccessFact> = {}): AccessFact => ({
	readableProjectIds: projects.map(({ id }) => id),
	operableProjectIds: projects.filter(({ kind }) => kind === 'team').map(({ id }) => id),
	coveredProjectIds: [SALES.id, PLATFORM.id, OPS.id, SUPPORT.id],
	projects: PROJECTS,
	credentials: {},
	createCredentialProjectIds: projects.map(({ id }) => id),
	sharingLicensed: true,
	canReadReviews: true,
	...over,
});

const promote = (over: Partial<PromoteCheckInput> = {}): PromoteCheckInput => ({
	allowIncomplete: false,
	references: [usesCrmKey(), callsNotify()],
	expressionReferences: [],
	sourceTargets: { 'credential:cred-crm': crmOnSource(), 'workflow:wf-notify': notifyOnSource() },
	branch: emptyBranch(),
	plan: plan(),
	access: access([SALES]),
	openReviews: [],
	...over,
});

const branchWithBoth = () =>
	emptyBranch({
		credentialFolders: { 'cred-crm': [PLATFORM.id] },
		credentials: { 'cred-crm': { name: 'CRM key', type: 'crmApi' } },
		workflows: {
			[syncOrders.id]: { projectId: SALES.id, name: 'Sync orders' },
			'wf-notify': { projectId: OPS.id, name: 'Notify on-call' },
		},
	});

const apply = (over: Partial<ApplyCheckInput> = {}): ApplyCheckInput => ({
	allowIncomplete: false,
	references: [usesCrmKey(), callsNotify()],
	expressionReferences: [],
	branch: branchWithBoth(),
	destinationTargets: {},
	callerVerdicts: {},
	destinationCallers: [],
	plan: plan(),
	access: access([SALES]),
	...over,
});

const crmOnDestination = {
	name: 'CRM key',
	credentialType: 'crmApi',
	project: PLATFORM,
	usageScope: 'project' as const,
	canRead: true,
	usableByProjectIds: [PLATFORM.id],
};
const notifyOnDestination = { name: 'Notify on-call', project: OPS, canRead: true };

// --- Output helpers.
function summary(report: PromotionDependencyReport): string {
	const parts = [
		`blocked=${report.blocked}`,
		`gaps=[${report.gaps
			.map(
				(gap) =>
					`${gap.consumer.name}->${gap.target.name ?? gap.target.id}:${gap.group}` +
					`{${gap.exits.join(',')}}${gap.state ? `<${gap.state}>` : ''}` +
					`${gap.target.project ? `@${gap.target.project.name}` : ''}` +
					`${gap.placeholder ? '+placeholder' : ''}${gap.detail ? `(${gap.detail})` : ''}`,
			)
			.join(' ; ')}]`,
	];
	if (report.warnings.length) {
		parts.push(`warnings=[${report.warnings.map((w) => `${w.target.id}:${w.code}`).join(', ')}]`);
	}
	if (report.notes.length) parts.push(`notes=[${report.notes.map((n) => n.code).join(', ')}]`);
	if (report.grants.length) {
		parts.push(
			`grants=[${report.grants.map((g) => `${g.credential.name}->${g.project.name}`).join(', ')}]`,
		);
	}
	if (report.credentialMoves.length) {
		parts.push(
			`moves=[${report.credentialMoves
				.map(
					(m) =>
						`${m.credential.name}:${m.fromProject?.name ?? '(hidden)'}->${m.toProject.name}` +
						` allowed=${m.allowed}${m.blockedReason ? `(${m.blockedReason})` : ''}`,
				)
				.join(', ')}]`,
		);
	}
	if (report.deletionCallers.length) {
		parts.push(
			`deletionCallers=[${report.deletionCallers
				.map(
					(d) =>
						`${d.target.name}<-${d.callers
							.map((c) => c.name + (c.publishedOnly ? '(published)' : ''))
							.join('+')} hidden=${d.hiddenCallerCount}`,
				)
				.join(', ')}]`,
		);
	}
	if (report.keptWorkflows.length) {
		parts.push(`kept=[${report.keptWorkflows.map((k) => k.name).join(', ')}]`);
	}
	if (report.credentialHomeChoices.length) {
		parts.push(
			`homeChoices=[${report.credentialHomeChoices
				.map((c) => `${c.credential.name}:${c.candidateProjects.map((p) => p.name).join('|')}`)
				.join(', ')}]`,
		);
	}
	if (report.hardBlocks.length) {
		parts.push(
			`hardBlocks=[${report.hardBlocks
				.map((b) => `${b.code}${b.detail ? JSON.stringify(b.detail) : ''}`)
				.join(', ')}]`,
		);
	}
	return parts.join(' ');
}

function scenario(
	title: string,
	report: PromotionDependencyReport,
	expectations: Array<[string, boolean]>,
) {
	const failed = expectations.filter(([, ok]) => !ok).map(([label]) => label);
	failures += failed.length;
	console.log(`${failed.length === 0 ? 'PASS' : 'FAIL'}  ${title}`);
	console.log(`      ${summary(report)}`);
	for (const label of failed) console.log(`      expected: ${label}`);
	if (verbose) console.log(JSON.stringify(report, null, 2));
}

const text = (report: PromotionDependencyReport) => JSON.stringify(report);
const gapOf = (report: PromotionDependencyReport, targetId: string) =>
	report.gaps.find(({ target }) => target.id === targetId);

// ============================== Promote ==============================
console.log('\n=== Promote ===');

{
	const report = computePromoteReport(promote());
	const gap = gapOf(report, 'cred-crm');
	scenario('4.1 builder with access to Sales only, strict', report, [
		['2 gaps', report.gaps.length === 2],
		['blocked', report.blocked],
		['group no-access', gap?.group === 'no-access'],
		['exit ask-owner only', gap?.exits.join() === 'ask-owner'],
		['name from the node, not the real name', gap?.target.name === 'CRM key'],
		['no project, no state', !gap?.target.project && !gap?.state],
		['no leak of project names', !/Platform|Ops/.test(text(report))],
	]);
}

{
	const report = computePromoteReport(promote({ allowIncomplete: true }));
	scenario('4.2 same builder, allow incomplete', report, [
		['2 gaps, not blocked', report.gaps.length === 2 && !report.blocked],
		['every gap can continue', report.gaps.every((g) => g.exits.includes('continue-incomplete'))],
		[
			'confirmation of both ids is ok',
			verifyConfirmedGaps(
				report,
				report.gaps.map((g) => g.id),
			) === 'ok',
		],
		[
			'confirmation of one id is changed',
			verifyConfirmedGaps(report, [report.gaps[0].id]) === 'changed',
		],
		['no confirmation is changed', verifyConfirmedGaps(report, undefined) === 'changed'],
		[
			'both rows get the reason confirmed-gap',
			[...requirementReasons(report).values()].join() === 'confirmed-gap,confirmed-gap',
		],
	]);
	console.log(
		renderGapsForCommitMessage(report)
			.split('\n')
			.map((line) => `      | ${line}`)
			.join('\n'),
	);
}

{
	const report = computePromoteReport(
		promote({
			access: access([SALES, PLATFORM, OPS]),
			openReviews: [
				{
					reviewId: 'rev-1',
					webUrl: 'https://git.example/mr/1',
					targetKeys: ['credential:cred-crm'],
				},
			],
		}),
	);
	const crm = gapOf(report, 'cred-crm');
	const notify = gapOf(report, 'wf-notify');
	scenario('4.3 user with access to Sales, Platform and Ops', report, [
		[
			'group other-project with include',
			crm?.group === 'other-project' && crm.exits.includes('include'),
		],
		[
			'include names the project and the resource key',
			crm?.include?.projectId === PLATFORM.id && crm.include.resourceKey === 'credential:cred-crm',
		],
		[
			'real name and project',
			crm?.target.name === 'CRM key (real name)' && crm.target.project?.name === 'Platform',
		],
		[
			'CRM key is in an open review with a link',
			crm?.state === 'in-open-review' && crm.review?.reviewId === 'rev-1',
		],
		['Notify on-call is not on the branch', notify?.state === 'not-on-branch'],
	]);
}

{
	const report = computePromoteReport(
		promote({
			access: access([SALES, PLATFORM, OPS]),
			plan: plan({
				writtenWorkflows: { [syncOrders.id]: SALES.id, 'wf-notify': OPS.id },
				writtenCredentials: { 'cred-crm': PLATFORM.id },
			}),
		}),
	);
	scenario('the user includes both dependencies', report, [
		['no gap', report.gaps.length === 0 && !report.blocked],
	]);
}

{
	const report = computePromoteReport(promote({ branch: branchWithBoth() }));
	scenario('each dependency is already on the branch (user cannot read them)', report, [
		['no gap', report.gaps.length === 0 && !report.blocked],
	]);
}

{
	const report = computePromoteReport(
		promote({
			access: access([SALES], { readableProjectIds: [SALES.id, PLATFORM.id] }),
			references: [usesCrmKey()],
		}),
	);
	const gap = gapOf(report, 'cred-crm');
	scenario('project that the user can read and cannot promote', report, [
		['group read-only-project', gap?.group === 'read-only-project'],
		['names Platform', gap?.target.project?.name === 'Platform'],
		['ask-owner, no include', gap?.exits.join() === 'ask-owner'],
	]);
}

{
	const report = computePromoteReport(
		promote({
			references: [usesCrmKey()],
			access: access([SALES], { coveredProjectIds: [SALES.id] }),
		}),
	);
	const gap = gapOf(report, 'cred-crm');
	scenario('project outside the environment scope, no access', report, [
		['group outside-environment', gap?.group === 'outside-environment'],
		['no include', !gap?.exits.includes('include')],
		['does not name Platform', !/Platform/.test(text(report))],
	]);
}

{
	const report = computePromoteReport(
		promote({
			references: [
				{
					consumer: syncOrders,
					target: {
						kind: 'credential',
						id: 'cred-alice',
						name: "Alice's token",
						credentialType: 'httpHeaderAuth',
					},
					usage: 'credential',
				},
			],
			sourceTargets: { 'credential:cred-alice': crmOnSource({ project: ALICE }) },
		}),
	);
	scenario('credential of a personal project', report, [
		['group personal', report.gaps[0]?.group === 'personal'],
		['exit move-to-team-project', report.gaps[0]?.exits.join() === 'move-to-team-project'],
		[
			'does not name Alice',
			!/Alice"|p-alice/.test(JSON.stringify(report.gaps[0]?.target.project ?? '')),
		],
	]);
}

{
	const report = computePromoteReport(
		promote({
			references: [
				callsNotify(),
				{
					consumer: dailyReport,
					target: { kind: 'workflow', id: 'wf-gone' },
					usage: 'sub-workflow',
				},
				{
					consumer: dailyReport,
					target: { kind: 'workflow', id: 'wf-unknown' },
					usage: 'error-workflow',
				},
			],
			sourceTargets: {
				'workflow:wf-notify': notifyOnSource(),
				'workflow:wf-gone': { exists: false, canRead: false, usableBy: {} },
			},
			plan: plan({ writtenWorkflows: { [syncOrders.id]: SALES.id, [dailyReport.id]: SALES.id } }),
		}),
	);
	scenario('broken on the source is a warning, unknown is a gap', report, [
		[
			'1 warning for the deleted workflow',
			report.warnings.length === 1 && report.warnings[0].target.id === 'wf-gone',
		],
		['a gap for the working call and for the unknown target', report.gaps.length === 2],
		[
			'the unknown target has no warning',
			!report.warnings.some((w) => w.target.id === 'wf-unknown'),
		],
		[
			'row reason broken-on-source',
			requirementReasons(report).get('workflow:wf-gone') === 'broken-on-source',
		],
	]);
}

{
	const report = computePromoteReport(
		promote({
			references: [
				{
					consumer: syncOrders,
					target: {
						kind: 'credential',
						id: 'cred-smtp',
						name: 'Shared SMTP',
						credentialType: 'smtp',
					},
					usage: 'credential',
				},
			],
			expressionReferences: [{ consumer: syncOrders, usage: 'sub-workflow' }],
			sourceTargets: {
				'credential:cred-smtp': {
					exists: true,
					usageScope: 'instance',
					canRead: false,
					usableBy: {},
				},
			},
		}),
	);
	scenario('instance credential and expression reference are notes', report, [
		['no gap', report.gaps.length === 0 && !report.blocked],
		[
			'2 notes',
			report.notes.map((n) => n.code).join() === 'instance-credential,expression-not-checked',
		],
		[
			'row reason instance-credential',
			requirementReasons(report).get('credential:cred-smtp') === 'instance-credential',
		],
	]);
}

{
	const report = computePromoteReport(
		promote({
			references: [usesCrmKey()],
			access: access([SALES, PLATFORM, OPS]),
			branch: emptyBranch({ credentialFolders: { 'cred-crm': [PLATFORM.id, OPS.id] } }),
		}),
	);
	scenario('credential id under two project folders', report, [
		['hard block', report.hardBlocks[0]?.code === 'ambiguous-credential-owner' && report.blocked],
		['names both folders', report.hardBlocks[0]?.detail?.folders === 'Platform, Ops'],
	]);
}

{
	const report = computePromoteReport(
		promote({
			references: [usesCrmKey()],
			branch: emptyBranch({
				topLevelCredentialIds: ['cred-crm'],
				credentials: { 'cred-crm': { name: 'CRM key', type: 'crmApi' } },
			}),
		}),
	);
	scenario('existing branch: a top-level credential is not on the branch', report, [
		['gap', report.gaps.length === 1 && report.blocked],
	]);
}

{
	const report = computePromoteReport(
		promote({
			references: [usesCrmKey()],
			access: access([SALES, PLATFORM]),
			sourceTargets: { 'credential:cred-crm': crmOnSource({ isPlaceholder: true }) },
			plan: plan({ writtenCredentials: { 'cred-crm': PLATFORM.id } }),
		}),
	);
	scenario('a reference to a placeholder is a gap, also when it is selected', report, [
		['gap without include', report.gaps.length === 1 && !report.gaps[0].exits.includes('include')],
		['detail placeholder-on-source', report.gaps[0]?.detail === 'placeholder-on-source'],
	]);
}

{
	const report = computePromoteReport(
		promote({
			allowIncomplete: true,
			references: [usesCrmKey(), callsNotify(), usesCrmKey(dailyReport)],
			plan: plan({ writtenWorkflows: { [syncOrders.id]: SALES.id, [dailyReport.id]: SALES.id } }),
		}),
	);
	scenario('each gap is one reference', report, [
		['3 gaps with 3 ids', new Set(report.gaps.map((g) => g.id)).size === 3],
	]);
}

// ============================== Apply ==============================
console.log('\n=== Apply ===');

{
	const report = computeApplyReport(
		apply({
			destinationTargets: {
				'credential:cred-crm': { ...crmOnDestination, usableByProjectIds: [PLATFORM.id, SALES.id] },
				'workflow:wf-notify': notifyOnDestination,
			},
		}),
	);
	scenario('each dependency is on the destination and usable', report, [
		['no gap', report.gaps.length === 0 && !report.blocked],
	]);
}

{
	const report = computeApplyReport(
		apply({ access: access([SALES, OPS], { operableProjectIds: [SALES.id, OPS.id] }) }),
	);
	const crm = gapOf(report, 'cred-crm');
	const notify = gapOf(report, 'wf-notify');
	scenario('on the branch, not on the destination: include or ask the owner', report, [
		[
			'Notify on-call: include, in Ops',
			notify?.group === 'other-project' &&
				notify.exits.join() === 'include' &&
				notify.target.project?.name === 'Ops',
		],
		[
			'CRM key: ask the owner, no project',
			crm?.group === 'no-access' && crm.exits.join() === 'ask-owner' && !crm.target.project,
		],
		['does not name Platform', !/Platform/.test(text(report))],
		['strict: no placeholder flag', !crm?.placeholder],
		['blocked', report.blocked],
	]);
}

{
	const { report, actions } = computeApplyOutcome(
		apply({
			allowIncomplete: true,
			references: [
				usesCrmKey(),
				usesCrmKey({ id: 'wf-page', name: 'Page engineer', projectId: OPS.id }),
			],
			branch: emptyBranch({
				requirements: {
					'credential:cred-crm': {
						reason: 'confirmed-gap',
						name: 'CRM key',
						credentialType: 'crmApi',
					},
				},
			}),
			plan: plan({
				writtenWorkflows: { [syncOrders.id]: SALES.id, 'wf-page': OPS.id },
				projectOrder: [SALES.id, OPS.id],
			}),
			access: access([SALES, OPS]),
		}),
	);
	scenario('4.4 incomplete Apply: one placeholder for two consumer projects', report, [
		[
			'2 gaps not-on-branch with the placeholder flag',
			report.gaps.length === 2 &&
				report.gaps.every((g) => g.group === 'not-on-branch' && g.placeholder),
		],
		['not blocked', !report.blocked],
		[
			'one placeholder, in Sales, shared with Ops',
			actions.placeholders.length === 1 &&
				actions.placeholders[0].projectId === SALES.id &&
				actions.placeholders[0].shareWithProjectIds.join() === OPS.id,
		],
	]);
}

{
	const report = computeApplyReport(
		apply({
			allowIncomplete: true,
			references: [usesCrmKey()],
			branch: emptyBranch(),
			access: access([SALES], { createCredentialProjectIds: [] }),
		}),
	);
	scenario('a placeholder needs the right to create a credential', report, [
		[
			'hard block placeholder-create-forbidden',
			report.hardBlocks[0]?.code === 'placeholder-create-forbidden' && report.blocked,
		],
	]);
}

{
	const base = {
		references: [usesCrmKey()],
		destinationTargets: { 'credential:cred-crm': crmOnDestination },
	};
	const grantable = computeApplyReport(
		apply({
			...base,
			access: access([SALES, PLATFORM], { credentials: { 'cred-crm': { canShare: true } } }),
		}),
	);
	scenario('the consumer project cannot use the credential: a grant', grantable, [
		[
			'1 grant for Sales, no gap',
			grantable.grants.length === 1 &&
				grantable.grants[0].project.name === 'Sales' &&
				grantable.gaps.length === 0,
		],
	]);
	const notGrantable = computeApplyReport(
		apply({ ...base, allowIncomplete: true, access: access([SALES, PLATFORM]) }),
	);
	scenario('the user may not share it: a gap, no placeholder', notGrantable, [
		['gap access-not-grantable', notGrantable.gaps[0]?.group === 'access-not-grantable'],
		['no placeholder', !notGrantable.gaps[0]?.placeholder],
	]);
}

{
	const report = computeApplyReport(
		apply({
			references: [callsNotify()],
			destinationTargets: { 'workflow:wf-notify': { ...notifyOnDestination, archived: true } },
			access: access([SALES, OPS]),
			plan: plan({ writtenWorkflows: { [syncOrders.id]: SALES.id, 'wf-notify': OPS.id } }),
		}),
	);
	scenario('an included workflow that is archived on the destination stays a gap', report, [
		[
			'gap archived-on-destination with restore',
			report.gaps[0]?.group === 'archived-on-destination' &&
				report.gaps[0].exits.join() === 'restore',
		],
	]);
	const hidden = computeApplyReport(
		apply({
			references: [callsNotify()],
			destinationTargets: { 'workflow:wf-notify': { ...notifyOnDestination, archived: true } },
		}),
	);
	scenario('archived, in a project that the user cannot access', hidden, [
		[
			'group no-access with ask-owner',
			hidden.gaps[0]?.group === 'no-access' && hidden.gaps[0].exits.join() === 'ask-owner',
		],
		['does not say archived, does not name Ops', !/archived|Ops/.test(text(hidden))],
	]);
}

{
	const report = computeApplyReport(
		apply({
			references: [callsNotify()],
			access: access([SALES, OPS]),
			plan: plan({ writtenWorkflows: { [syncOrders.id]: SALES.id, 'wf-notify': OPS.id } }),
			callerVerdicts: { 'wf-notify': { [syncOrders.id]: false } },
		}),
	);
	scenario('an included sub-workflow refuses the caller', report, [
		[
			'gap caller-policy with change-policy',
			report.gaps[0]?.group === 'caller-policy' && report.gaps[0].exits.join() === 'change-policy',
		],
	]);
}

{
	const refs: ReferenceFact[] = [
		{ consumer: dailyReport, target: { kind: 'workflow', id: 'wf-a' }, usage: 'sub-workflow' },
		{ consumer: dailyReport, target: { kind: 'workflow', id: 'wf-b' }, usage: 'sub-workflow' },
		{ consumer: dailyReport, target: { kind: 'workflow', id: 'wf-c' }, usage: 'sub-workflow' },
		{
			consumer: dailyReport,
			target: { kind: 'credential', id: 'cred-mail', name: 'Mail key', credentialType: 'smtp' },
			usage: 'credential',
		},
		{ consumer: dailyReport, target: { kind: 'workflow', id: 'wf-d' }, usage: 'sub-workflow' },
	];
	const report = computeApplyReport(
		apply({
			references: refs,
			branch: emptyBranch({
				requirements: {
					'workflow:wf-a': { reason: 'broken-on-source' },
					'workflow:wf-b': { reason: 'confirmed-gap' },
					'workflow:wf-d': { reason: 'broken-on-source' },
				},
			}),
			// Broken on the source wins, also when the target is archived on the destination.
			destinationTargets: { 'workflow:wf-d': { archived: true, canRead: false } },
			plan: plan({ writtenWorkflows: { [dailyReport.id]: SALES.id } }),
		}),
	);
	scenario('a reference that is not on the branch follows the reason', report, [
		[
			'broken on the source: warnings for wf-a and wf-d',
			report.warnings
				.filter((w) => w.code === 'broken-on-source')
				.map((w) => w.target.id)
				.join() === 'wf-a,wf-d',
		],
		['confirmed gap: gap for wf-b', gapOf(report, 'wf-b')?.group === 'not-on-branch'],
		[
			'no reason, workflow: legacy warning for wf-c',
			report.warnings.some((w) => w.target.id === 'wf-c' && w.code === 'legacy-workflow-reference'),
		],
		[
			'no reason, credential: gap for Mail key',
			gapOf(report, 'cred-mail')?.detail === 'legacy-reference',
		],
	]);
}

{
	const notify = { id: 'wf-notify', name: 'Notify on-call', projectId: OPS.id };
	const report = computeApplyReport(
		apply({
			references: [callsNotify()],
			branch: emptyBranch(),
			destinationTargets: { 'workflow:wf-notify': notifyOnDestination },
			plan: plan({ deletedWorkflows: [notify] }),
			access: access([SALES, OPS]),
		}),
	);
	scenario(
		'deletions 1: the selection deletes a workflow that an item of the Apply calls',
		report,
		[
			[
				'gap deleted-by-apply with remove-deletion',
				report.gaps[0]?.group === 'deleted-by-apply' &&
					report.gaps[0].exits.join() === 'remove-deletion',
			],
		],
	);

	const kept = computeApplyOutcome(
		apply({
			references: [callsNotify()],
			branch: emptyBranch(),
			destinationTargets: { 'workflow:wf-notify': notifyOnDestination },
			plan: plan({ reconcileDeletedWorkflows: [notify] }),
			access: access([SALES, OPS]),
		}),
	);
	scenario(
		'deletions 2: an instance Apply keeps a workflow that the package references',
		kept.report,
		[
			[
				'kept with Sync orders as its caller',
				kept.report.keptWorkflows[0]?.referencedBy[0]?.name === 'Sync orders',
			],
			['no gap', kept.report.gaps.length === 0],
			['the operation gets the id', kept.actions.keptWorkflowIds.join() === 'wf-notify'],
		],
	);

	const callers = computeApplyReport(
		apply({
			references: [{ ...callsNotify(dailyReport), publishedOnly: true }],
			branch: emptyBranch(),
			destinationTargets: { 'workflow:wf-notify': notifyOnDestination },
			plan: plan({ writtenWorkflows: { [dailyReport.id]: SALES.id }, deletedWorkflows: [notify] }),
			destinationCallers: [
				{
					targetId: 'wf-notify',
					caller: { id: 'wf-legacy', name: 'Legacy alert', projectId: SUPPORT.id },
				},
			],
			access: access([SALES, OPS]),
		}),
	);
	scenario('deletions 3: callers on the destination, published version, hidden count', callers, [
		[
			'Daily report is listed with publishedOnly',
			callers.deletionCallers[0]?.callers[0]?.publishedOnly === true,
		],
		['1 hidden caller', callers.deletionCallers[0]?.hiddenCallerCount === 1],
		['does not name Legacy alert or Support', !/Legacy alert|Support/.test(text(callers))],
		[
			'no gap, not blocked: the user accepts or cancels',
			callers.gaps.length === 0 && !callers.blocked,
		],
	]);
}

{
	const base = {
		references: [],
		plan: plan({ writtenWorkflows: {}, writtenCredentials: { 'cred-crm': PLATFORM.id } }),
	};
	const placeholder = computeApplyReport(
		apply({
			...base,
			destinationTargets: {
				'credential:cred-crm': { ...crmOnDestination, project: OPS, isPlaceholder: true },
			},
			access: access([PLATFORM]),
		}),
	);
	scenario(
		'the owner follows the branch: a placeholder in a project that the user cannot access',
		placeholder,
		[
			[
				'move allowed',
				placeholder.credentialMoves[0]?.allowed === true &&
					placeholder.credentialMoves[0].placeholder,
			],
			[
				'does not name Ops',
				!placeholder.credentialMoves[0]?.fromProject && !/Ops/.test(text(placeholder)),
			],
		],
	);
	const withValues = computeApplyReport(
		apply({
			...base,
			destinationTargets: { 'credential:cred-crm': { ...crmOnDestination, project: OPS } },
			access: access([PLATFORM, OPS]),
		}),
	);
	scenario('a credential with values does not move without the right to move it', withValues, [
		[
			'move not allowed, not blocked',
			withValues.credentialMoves[0]?.allowed === false &&
				withValues.credentialMoves[0].blockedReason === 'no-move-right' &&
				!withValues.blocked,
		],
	]);
	const noCreate = computeApplyReport(
		apply({
			...base,
			destinationTargets: {
				'credential:cred-crm': { ...crmOnDestination, project: OPS, isPlaceholder: true },
			},
			access: access([PLATFORM], { createCredentialProjectIds: [] }),
		}),
	);
	scenario(
		'a placeholder cannot move without the right to create in the new owner project',
		noCreate,
		[
			[
				'hard block credential-move-forbidden',
				noCreate.hardBlocks[0]?.code === 'credential-move-forbidden' && noCreate.blocked,
			],
		],
	);
}

{
	const mismatch = computeApplyReport(
		apply({
			allowIncomplete: true,
			references: [usesCrmKey()],
			destinationTargets: {
				'credential:cred-crm': { ...crmOnDestination, credentialType: 'otherApi' },
			},
			access: access([SALES, PLATFORM]),
		}),
	);
	scenario('same id and another type blocks in both modes', mismatch, [
		[
			'hard block with both types',
			mismatch.hardBlocks[0]?.code === 'credential-type-mismatch' &&
				mismatch.hardBlocks[0].detail?.destinationType === 'otherApi' &&
				mismatch.blocked,
		],
	]);
	const instance = computeApplyReport(
		apply({
			allowIncomplete: true,
			references: [usesCrmKey()],
			branch: emptyBranch({
				requirements: { 'credential:cred-crm': { reason: 'instance-credential' } },
			}),
		}),
	);
	scenario('an instance credential that the destination does not hold', instance, [
		[
			'hard block instance-credential-missing, no placeholder',
			instance.hardBlocks[0]?.code === 'instance-credential-missing' && instance.gaps.length === 0,
		],
	]);
}

{
	const topLevel = emptyBranch({
		topLevelCredentialIds: ['cred-crm'],
		credentials: { 'cred-crm': { name: 'CRM key', type: 'crmApi' } },
	});
	const report = computeApplyReport(
		apply({
			allowIncomplete: true,
			references: [usesCrmKey()],
			branch: topLevel,
			access: access([OPS, SALES, ALICE]),
			plan: plan({ deletedProjectIds: [SUPPORT.id] }),
		}),
	);
	scenario('existing branch: the user selects the home of a top-level credential', report, [
		[
			'home choice, Sales first, no personal project',
			report.credentialHomeChoices[0]?.candidateProjects.map((p) => p.name).join() === 'Sales,Ops',
		],
		['blocked in both modes, no gap', report.blocked && report.gaps.length === 0],
	]);
	const chosen = computeApplyReport(
		apply({
			references: [usesCrmKey()],
			branch: topLevel,
			access: access([OPS, SALES]),
			credentialHomes: { 'cred-crm': SALES.id },
		}),
	);
	scenario('the user selected the home', chosen, [
		['no choice left, not blocked', chosen.credentialHomeChoices.length === 0 && !chosen.blocked],
	]);
}

console.log(failures === 0 ? '\nAll expectations hold.' : `\n${failures} expectation(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
