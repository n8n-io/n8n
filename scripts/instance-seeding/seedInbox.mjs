#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SEED_MARKER = 'ast-1517-inbox';
const CASES = [
	{ key: 'fix', outcome: 'fix_ready', changes: true, title: 'Fix ready' },
	{
		key: 'attention-changes',
		outcome: 'needs_you',
		changes: true,
		title: 'Needs attention with changes',
	},
	{
		key: 'attention',
		outcome: 'needs_you',
		changes: false,
		title: 'Needs attention without changes',
	},
	{ key: 'no-fix', outcome: 'could_not_fix', changes: false, title: 'Could not fix' },
];

// The caller supplies real repositories and services. Only investigation output is fixed.
export async function seedInbox(runtime, userId) {
	const { db, container, suggestions, results } = runtime;
	const user = await container.get(db.UserRepository).findByIdWithRole(userId);
	if (!user || user.disabled) throw new Error('Choose an enabled user with INBOX_SEED_USER_ID.');
	const project = await container
		.get(db.ProjectRepository)
		.getPersonalProjectForUserOrFail(user.id);
	const workflows = container.get(db.WorkflowRepository);
	const ownership = container.get(db.SharedWorkflowRepository);
	const published = container.get(db.WorkflowPublishedVersionRepository);
	const seeded = [];

	for (const example of CASES) {
		const id = createHash('sha256')
			.update(`${SEED_MARKER}:${user.id}:${example.key}`)
			.digest('hex')
			.slice(0, 24);
		const previous = await workflows.findOneBy({ id });
		if (previous) {
			const owner = await ownership.getWorkflowOwningProject(id);
			if (previous.staticData?.inboxSeed !== SEED_MARKER || owner?.id !== project.id) {
				throw new Error(
					`The seed workflow ${id} no longer belongs to this seed. This workflow was not removed.`,
				);
			}
			await published.removePublishedVersion(id);
			await workflows.delete({ id });
		}

		const versionId = randomUUID();
		const triggerId = randomUUID();
		const input = workflows.create({
			id,
			name: `[inbox seed] ${example.title}`,
			active: false,
			isArchived: false,
			versionId,
			staticData: { inboxSeed: SEED_MARKER },
			nodes: [
				{
					id: triggerId,
					name: 'When clicking Execute workflow',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: randomUUID(),
					name: 'Prepare request',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [240, 0],
					parameters: {},
				},
			],
			connections: {
				'When clicking Execute workflow': {
					main: [[{ node: 'Prepare request', type: 'main', index: 0 }]],
				},
			},
			settings: {},
		});
		const policyCleared = await runtime.policy.enforceWorkflowSave(
			{ workflow: input, storedWorkflow: null, projectId: project.id },
			{ kind: 'user', user },
		);
		const workflow = await workflows.createContent(input, { policyCleared });
		await ownership.save({ workflowId: id, projectId: project.id, role: 'workflow:owner' });
		await container.get(db.WorkflowHistoryRepository).save({
			versionId,
			workflowId: id,
			nodes: workflow.nodes,
			connections: workflow.connections,
			nodeGroups: [],
			authors: 'Inbox seed',
		});
		// Seed a published snapshot without starting a trigger or external request.
		await workflows.update(id, { activeVersionId: versionId, active: true });
		await published.setPublishedVersion(id, versionId);
		await container.get(db.WorkflowPublicationTriggerStatusRepository).replaceForWorkflow(id, [
			{
				nodeId: triggerId,
				versionId,
				status: 'activated',
				triggerKind: 'persisted',
				errorMessage: null,
			},
		]);
		const execution = await container.get(db.ExecutionRepository).save({
			createdAt: new Date(),
			workflowId: id,
			workflowVersionId: versionId,
			status: 'error',
			mode: 'manual',
			finished: false,
			startedAt: new Date(),
			stoppedAt: new Date(),
		});
		await container.get(db.ExecutionDataRepository).save({
			executionId: execution.id,
			workflowData: workflow,
			data: runtime.stringify({
				resultData: {
					runData: {},
					error: { message: 'Seeded investigation example', name: 'Error' },
				},
			}),
		});
		const suggestion = example.changes
			? await suggestions.prepareSuggestion(await suggestions.captureBaseline(id, user.id), {
					graph: {
						nodes: workflow.nodes.map((node) =>
							node.name === 'Prepare request'
								? { ...node, notes: 'Check the request before the next run.', notesInFlow: true }
								: node,
						),
						connections: workflow.connections,
					},
					explanation: 'Add a reminder to check the request before the next run.',
					resultKind: example.outcome,
				})
			: undefined;
		const result = await results.complete({
			workflowId: id,
			projectId: project.id,
			backgroundUserId: user.id,
			executionId: execution.id,
			outcome: example.outcome,
			summary: example.title,
			report: `Development example: ${example.title}. Review the workflow before the next run.`,
			usage: {
				credits: null,
				turns: 2,
				durationSeconds: 30,
				promptTokens: 1000,
				completionTokens: 200,
				totalTokens: 1200,
			},
			...(suggestion ? { suggestion } : {}),
		});
		seeded.push({
			outcome: example.outcome,
			resultId: result.id,
			workflowId: id,
			projectId: project.id,
		});
	}
	return seeded;
}

async function main() {
	if (process.env.NODE_ENV === 'production')
		throw new Error('Run this seed in a development instance.');
	if (!process.env.N8N_USER_FOLDER || !process.env.INBOX_SEED_USER_ID) {
		throw new Error('Set N8N_USER_FOLDER and INBOX_SEED_USER_ID for the development instance.');
	}
	const require = createRequire(new URL('../../packages/cli/package.json', import.meta.url));
	require('reflect-metadata');
	const { Container } = require('@n8n/di');
	const { ModuleRegistry } = require('@n8n/backend-common');
	const db = require('@n8n/db');
	const cliFile = (file) =>
		fileURLToPath(new URL(`../../packages/cli/dist/${file}`, import.meta.url));
	const { InstanceAiModule } = require(cliFile('modules/instance-ai/instance-ai.module.js'));
	Container.get(ModuleRegistry).entities.push(
		...(await Container.get(InstanceAiModule).entities()),
	);
	const connection = Container.get(db.DbConnection);
	try {
		await connection.init();
		const { SelfHealingResultService } = require(
			cliFile('modules/instance-ai/self-healing/self-healing-result.service.js'),
		);
		const { WorkflowSuggestionService } = require(
			cliFile('modules/instance-ai/workflow-suggestions/workflow-suggestion.service.js'),
		);
		const { PolicyEnforcementService } = require(cliFile('policy/policy-enforcement.service.js'));
		const seeded = await seedInbox(
			{
				db,
				container: Container,
				stringify: require('flatted').stringify,
				results: Container.get(SelfHealingResultService),
				policy: Container.get(PolicyEnforcementService),
				suggestions: Container.get(WorkflowSuggestionService),
			},
			process.env.INBOX_SEED_USER_ID,
		);
		console.log(JSON.stringify(seeded, null, 2));
	} finally {
		await connection.close();
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
