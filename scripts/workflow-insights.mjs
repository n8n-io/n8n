#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_EFFORT = 'medium';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

const OBSERVATION_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['workflowId', 'workflowName', 'observations'],
	properties: {
		workflowId: { type: 'string' },
		workflowName: { type: 'string' },
		observations: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['id', 'lens', 'observation', 'nodeIds', 'nodeNames'],
				properties: {
					id: { type: 'string' },
					lens: {
						type: 'string',
						enum: [
							'architecture',
							'systems_of_record',
							'error_handling',
							'notifications',
							'naming',
							'credentials',
							'prompts',
							'data_transform',
							'other',
						],
					},
					observation: { type: 'string' },
					nodeIds: { type: 'array', items: { type: 'string' } },
					nodeNames: { type: 'array', items: { type: 'string' } },
				},
			},
		},
	},
};

const LEARNINGS_SCHEMA = {
	type: 'object',
	additionalProperties: false,
	required: ['learnings', 'rejected', 'methodNotes'],
	properties: {
		learnings: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: [
					'statement',
					'kind',
					'appliesWhen',
					'supportingWorkflowIds',
					'supportingObservationIds',
					'supportingWorkflowCount',
					'counterexampleWorkflowIds',
					'counterexampleCount',
					'confidence',
					'sensitivity',
					'transferability',
					'rejectedAlternatives',
				],
				properties: {
					statement: { type: 'string' },
					kind: {
						type: 'string',
						enum: ['preference', 'environment_fact', 'hypothesis'],
					},
					appliesWhen: { type: 'string' },
					supportingWorkflowIds: { type: 'array', items: { type: 'string' } },
					supportingObservationIds: { type: 'array', items: { type: 'string' } },
					supportingWorkflowCount: { type: 'integer' },
					counterexampleWorkflowIds: { type: 'array', items: { type: 'string' } },
					counterexampleCount: { type: 'integer' },
					confidence: { type: 'number' },
					sensitivity: {
						type: 'string',
						enum: ['internal', 'public', 'sensitive'],
					},
					transferability: { type: 'string' },
					rejectedAlternatives: { type: 'array', items: { type: 'string' } },
				},
			},
		},
		rejected: {
			type: 'array',
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['candidate', 'reason'],
				properties: {
					candidate: { type: 'string' },
					reason: { type: 'string' },
				},
			},
		},
		methodNotes: { type: 'string' },
	},
};

function usage() {
	console.log(`Usage:
  node scripts/workflow-insights.mjs --input <export.json> [options]

Options:
  --stage <all|observe|reduce>  Stage to run (default: all)
  --output <directory>         Output directory
  --model <model-id>           Anthropic model (default: ${DEFAULT_MODEL})
  --effort <level>             low, medium, high, or max (default: ${DEFAULT_EFFORT})
  --concurrency <number>       Concurrent workflow requests (default: 3)
  --limit <number>             Process only the first N workflows
  --workflow-id <id>           Process one workflow (repeatable)
  --no-resume                  Re-run completed per-workflow observations
  --dry-run                    Validate and describe work without API calls
  --help                       Show this help

Environment:
  ANTHROPIC_API_KEY            Required unless --dry-run is used
  ANTHROPIC_MODEL              Optional model override
  ANTHROPIC_EFFORT             Optional effort override
`);
}

function parseArgs(argv) {
	const options = {
		stage: 'all',
		model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
		effort: process.env.ANTHROPIC_EFFORT ?? DEFAULT_EFFORT,
		concurrency: 3,
		resume: true,
		dryRun: false,
		workflowIds: [],
	};

	for (let index = 0; index < argv.length; index++) {
		const argument = argv[index];
		const value = argv[index + 1];

		switch (argument) {
			case '--input':
				options.input = value;
				index++;
				break;
			case '--output':
				options.output = value;
				index++;
				break;
			case '--stage':
				options.stage = value;
				index++;
				break;
			case '--model':
				options.model = value;
				index++;
				break;
			case '--effort':
				options.effort = value;
				index++;
				break;
			case '--concurrency':
				options.concurrency = Number(value);
				index++;
				break;
			case '--limit':
				options.limit = Number(value);
				index++;
				break;
			case '--workflow-id':
				options.workflowIds.push(value);
				index++;
				break;
			case '--no-resume':
				options.resume = false;
				break;
			case '--dry-run':
				options.dryRun = true;
				break;
			case '--help':
				options.help = true;
				break;
			default:
				throw new Error(`Unknown argument: ${argument}`);
		}
	}

	return options;
}

function assertOptions(options) {
	if (options.help) return;
	if (!options.input) throw new Error('--input is required');
	if (!['all', 'observe', 'reduce'].includes(options.stage)) {
		throw new Error('--stage must be all, observe, or reduce');
	}
	if (!['low', 'medium', 'high', 'max'].includes(options.effort)) {
		throw new Error('--effort must be low, medium, high, or max');
	}
	if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 20) {
		throw new Error('--concurrency must be an integer from 1 to 20');
	}
	if (
		options.limit !== undefined &&
		(!Number.isInteger(options.limit) || options.limit < 1)
	) {
		throw new Error('--limit must be a positive integer');
	}
}

function redact(value, key = '') {
	if (Array.isArray(value)) return value.map((item) => redact(item, key));
	if (value === null || typeof value !== 'object') {
		if (typeof value !== 'string') return value;

		const normalizedKey = key.toLowerCase();
		if (
			['password', 'secret', 'token', 'apikey', 'api_key', 'authorization'].some((part) =>
				normalizedKey.includes(part),
			)
		) {
			return '[redacted]';
		}

		return value
			.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, 'Bearer [redacted]')
			.replace(/\b(?:sk|key)-[A-Za-z0-9_-]{16,}\b/g, '[redacted]');
	}

	return Object.fromEntries(
		Object.entries(value).map(([entryKey, entryValue]) => [
			entryKey,
			redact(entryValue, entryKey),
		]),
	);
}

function removeCredentialIds(value) {
	if (Array.isArray(value)) return value.map(removeCredentialIds);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([entryKey, entryValue]) => [
				entryKey,
				removeCredentialIds(entryValue),
			]),
		);
	}
	if (typeof value !== 'string') return value;

	return value
		.replace(/\s*\(\s*(?:credential\s+)?id\s+[A-Za-z0-9_-]+\s*\)/gi, '')
		.replace(
			/(\bcredential(?:\s+named)?\s+['"][^'"]+['"])\s*,?\s*(?:credential\s+)?id\s+[A-Za-z0-9_-]+/gi,
			'$1',
		)
		.replace(
			/(\b(?:document|spreadsheet|folder|file)\s+id)\s+[A-Za-z0-9_-]{12,}/gi,
			'$1 [redacted]',
		);
}

function normalizeReducerOutput(output, observationDocuments) {
	const observationOwners = new Map();
	const knownWorkflowIds = new Set();
	for (const document of observationDocuments) {
		knownWorkflowIds.add(document.workflowId);
		for (const observation of document.observations) {
			observationOwners.set(observation.id, document.workflowId);
		}
	}

	const sanitized = removeCredentialIds(output);
	return {
		...sanitized,
		learnings: sanitized.learnings.map((learning) => {
			const supportingObservationIds = [
				...new Set(
					learning.supportingObservationIds.filter((id) => observationOwners.has(id)),
				),
			];
			const supportingWorkflowIds = [
				...new Set(supportingObservationIds.map((id) => observationOwners.get(id))),
			];
			const counterexampleWorkflowIds = [
				...new Set(
					learning.counterexampleWorkflowIds.filter((id) => knownWorkflowIds.has(id)),
				),
			];
			const supportingWorkflowCount = supportingWorkflowIds.length;

			const statement = learning.statement
				.replace(
					/^(Across \d+ observed[^,]{0,80}\bworkflows?)\s*\([^)]*\)/i,
					'$1',
				)
				.replace(
					/^Across \d+(?=\s+observed[^,]{0,80}\bworkflows?\b)/i,
					`Across ${supportingWorkflowCount}`,
				)
				.replace(/\ball\b\s*/gi, '')
				.replace(/\bevery\b/gi, 'each')
				.replace(/\balways\b/gi, 'consistently')
				.replace(/\bexclusively\b/gi, 'only')
				.replace(/\bnever\b/gi, 'not');

			return {
				...learning,
				statement,
				supportingWorkflowIds,
				supportingObservationIds,
				supportingWorkflowCount,
				counterexampleWorkflowIds,
				counterexampleCount: counterexampleWorkflowIds.length,
			};
		}),
	};
}

function workflowForAnalysis(workflow) {
	const nodes = workflow.nodes?.map((node) => ({
		...node,
		credentials:
			node.credentials && typeof node.credentials === 'object'
				? Object.fromEntries(
						Object.entries(node.credentials).map(([credentialType, credential]) => [
							credentialType,
							credential && typeof credential === 'object'
								? { name: credential.name }
								: credential,
						]),
					)
				: node.credentials,
	}));

	return redact({
		id: workflow.id,
		name: workflow.name,
		active: workflow.active,
		isArchived: workflow.isArchived,
		createdAt: workflow.createdAt,
		updatedAt: workflow.updatedAt,
		nodes,
		connections: workflow.connections,
		settings: workflow.settings,
		meta: workflow.meta,
		tags: workflow.tags,
	});
}

function observationPrompt(workflow) {
	return `Extract concrete observations from this n8n workflow. Describe only what the graph supports.

What makes an observation useful: it captures a CHOICE — something that could
plausibly have been done another way — together with its specific values (channel
names, credential names, dataset/table names, URLs, model ids, prompt structure
and language, naming patterns). "Uses a Slack node" is useless; "sends error
notifications to Slack #ops-alerts with the execution URL in the message" is useful.
Common patterns are fine to record when you capture their specifics; skip commentary
on n8n itself and best-practice judgments.
Sticky notes are the builder's own documentation — treat their content as high-signal
evidence.

Rules:
- Cite exact node IDs and node names. Do not invent nodes.
- Do not include secrets, tokens, raw credential values, customer data, or long payloads.
- Never include credential IDs.
- Ignore disconnected nodes unless the observation explicitly says they are disconnected.
- Prefer 3-10 useful observations. An empty list is valid for a trivial workflow.
- Use IDs in the form "${workflow.id}-obs-1", incrementing within this workflow.

<workflow_json>
${JSON.stringify(workflowForAnalysis(workflow))}
</workflow_json>`;
}

function reductionPrompt(projectId, observationDocuments) {
	return `Synthesize reusable, instance-specific knowledge from independently extracted n8n
workflow observations. You do not have the original workflows. Do not claim evidence that is not
present in these observations.

A valid learning must:
- help an assistant build or modify another workflow in the same scope;
- reflect this team, project, or environment;
- be supported by concrete observations;
- not be a universal n8n best practice;
- not expose secrets or unnecessarily reproduce sensitive data.

Distinguish preferences, environment facts, and tentative hypotheses. Analyze application choices
by purpose, systems of record, error handling and escalation, AI prompt conventions, architecture
and reuse, naming, organization, and transformations. Also discover patterns outside these lenses.

For each candidate:
- state when it applies;
- cite supporting workflow IDs and observation IDs;
- count distinct supporting workflows;
- count only explicit contradictions as counterexamples (omission is not a counterexample);
- do not use "all", "every", "always", "exclusively", or equivalent universal language;
- start cross-workflow claims with "Across N observed workflows" or otherwise state the evidence
  scope explicitly, even when every applicable workflow appears to support the claim;
- when support is partial, qualify the statement with its observed scope instead of generalizing;
- explain transferability and assign calibrated confidence;
- reject it if generic, unsupported, one-off, or not actionable.

A one-workflow candidate may survive only when it is an explicit, useful environment mapping and
must have appropriately lower confidence. Prefer a small set of strong learnings over an exhaustive
catalogue. Never repeat a credential ID, even if one appears in an observation. Omit database record
IDs, secrets, tokens, and unnecessary personal data. Credential names and types may be retained when
they are actionable.

Project ID: ${projectId ?? 'unknown'}

<workflow_observations>
${JSON.stringify(observationDocuments)}
</workflow_observations>`;
}

async function writeJsonAtomic(path, value) {
	await mkdir(dirname(path), { recursive: true });
	const temporaryPath = `${path}.${process.pid}.tmp`;
	await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
	await rename(temporaryPath, path);
}

async function readJson(path) {
	return JSON.parse(await readFile(path, 'utf8'));
}

function sleep(milliseconds) {
	return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function callAnthropic({
	apiKey,
	model,
	effort,
	maxTokens,
	prompt,
	schema,
	label,
}) {
	for (let attempt = 0; attempt < 5; attempt++) {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': API_VERSION,
			},
			body: JSON.stringify({
				model,
				max_tokens: maxTokens,
				messages: [{ role: 'user', content: prompt }],
				output_config: {
					effort,
					format: {
						type: 'json_schema',
						schema,
					},
				},
			}),
			signal: AbortSignal.timeout(10 * 60 * 1000),
		});

		if (response.ok) {
			const message = await response.json();
			const text = message.content?.find((block) => block.type === 'text')?.text;
			if (!text) throw new Error(`${label}: Anthropic returned no text block`);

			return {
				output: JSON.parse(text),
				usage: message.usage,
				messageId: message.id,
				model: message.model,
				stopReason: message.stop_reason,
			};
		}

		const body = await response.text();
		const retryable = response.status === 429 || response.status >= 500;
		if (!retryable || attempt === 4) {
			throw new Error(`${label}: Anthropic API ${response.status}: ${body.slice(0, 500)}`);
		}

		const retryAfterHeader = response.headers.get('retry-after');
		const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
		const delay =
			Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
		console.warn(`${label}: API ${response.status}; retrying in ${delay}ms`);
		await sleep(delay);
	}

	throw new Error(`${label}: exhausted retries`);
}

async function mapConcurrent(items, concurrency, fn) {
	const results = Array(items.length);
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < items.length) {
			const index = nextIndex++;
			results[index] = await fn(items[index], index);
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
	return results;
}

function observationPath(outputDirectory, workflowId) {
	const safeId = String(workflowId).replace(/[^A-Za-z0-9_-]/g, '_');
	return join(outputDirectory, 'observations', `${safeId}.json`);
}

async function runObservations({ workflows, options, outputDirectory, apiKey }) {
	let completed = 0;
	let skipped = 0;

	await mapConcurrent(workflows, options.concurrency, async (workflow) => {
		const path = observationPath(outputDirectory, workflow.id);
		if (options.resume && existsSync(path)) {
			await readJson(path);
			skipped++;
			console.log(`[${completed + skipped}/${workflows.length}] resume ${workflow.id} ${workflow.name}`);
			return;
		}

		const result = await callAnthropic({
			apiKey,
			model: options.model,
			effort: options.effort,
			maxTokens: 4096,
			prompt: observationPrompt(workflow),
			schema: OBSERVATION_SCHEMA,
			label: `workflow ${workflow.id}`,
		});

		await writeJsonAtomic(path, {
			...result.output,
			_request: {
				model: result.model,
				effort: options.effort,
				messageId: result.messageId,
				usage: result.usage,
				stopReason: result.stopReason,
			},
		});
		completed++;
		console.log(`[${completed + skipped}/${workflows.length}] observed ${workflow.id} ${workflow.name}`);
	});

	return { completed, skipped };
}

async function loadObservations(workflows, outputDirectory) {
	return await Promise.all(
		workflows.map(async (workflow) => {
			const path = observationPath(outputDirectory, workflow.id);
			if (!existsSync(path)) {
				throw new Error(`Missing observation for workflow ${workflow.id}: ${path}`);
			}
			const document = await readJson(path);
			delete document._request;
			return document;
		}),
	);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	assertOptions(options);

	if (options.help) {
		usage();
		return;
	}

	const inputPath = resolve(options.input);
	const input = await readJson(inputPath);
	if (!Array.isArray(input.workflows)) {
		throw new Error('Input must be an object with a workflows array');
	}

	let workflows = input.workflows;
	if (options.workflowIds.length > 0) {
		const selectedIds = new Set(options.workflowIds);
		workflows = workflows.filter((workflow) => selectedIds.has(String(workflow.id)));
		const foundIds = new Set(workflows.map((workflow) => String(workflow.id)));
		const missingIds = [...selectedIds].filter((id) => !foundIds.has(id));
		if (missingIds.length > 0) throw new Error(`Workflow IDs not found: ${missingIds.join(', ')}`);
	}
	if (options.limit !== undefined) workflows = workflows.slice(0, options.limit);
	if (workflows.length === 0) throw new Error('No workflows selected');

	const outputDirectory = resolve(
		options.output ?? join(dirname(inputPath), `${basename(inputPath, '.json')}-anthropic`),
	);

	console.log(
		JSON.stringify(
			{
				input: inputPath,
				output: outputDirectory,
				stage: options.stage,
				model: options.model,
				effort: options.effort,
				concurrency: options.concurrency,
				workflowCount: workflows.length,
				resume: options.resume,
				dryRun: options.dryRun,
			},
			null,
			2,
		),
	);

	if (options.dryRun) return;

	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');
	await mkdir(outputDirectory, { recursive: true });

	const startedAt = new Date().toISOString();
	const run = {
		startedAt,
		input: inputPath,
		projectId: input.source?.projectId,
		model: options.model,
		effort: options.effort,
		stage: options.stage,
		workflowIds: workflows.map((workflow) => String(workflow.id)),
	};

	if (options.stage === 'all' || options.stage === 'observe') {
		run.observations = await runObservations({
			workflows,
			options,
			outputDirectory,
			apiKey,
		});
	}

	if (options.stage === 'all' || options.stage === 'reduce') {
		const observations = removeCredentialIds(
			await loadObservations(workflows, outputDirectory),
		);
		const result = await callAnthropic({
			apiKey,
			model: options.model,
			effort: options.effort,
			maxTokens: 32000,
			prompt: reductionPrompt(input.source?.projectId, observations),
			schema: LEARNINGS_SCHEMA,
			label: 'reducer',
		});
		const sanitizedOutput = normalizeReducerOutput(result.output, observations);
		await writeJsonAtomic(join(outputDirectory, 'learnings.json'), {
			...sanitizedOutput,
			_request: {
				model: result.model,
				effort: options.effort,
				messageId: result.messageId,
				usage: result.usage,
				stopReason: result.stopReason,
			},
		});
		run.reducer = {
			messageId: result.messageId,
			usage: result.usage,
			learningCount: sanitizedOutput.learnings.length,
			rejectedCount: sanitizedOutput.rejected.length,
		};
	}

	run.completedAt = new Date().toISOString();
	await writeJsonAtomic(join(outputDirectory, 'run.json'), run);
	console.log(`Completed. Results: ${outputDirectory}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
