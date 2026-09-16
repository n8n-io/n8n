import type { RestClient } from './api';
import { dbQuery } from './db';
import type { CycleContext } from './harness';
import { fail, metric, ok, step } from './harness';

/** Ids of the data one cycle seeds and keeps asserting across phases. */
export interface SeededJourneys {
	workflowId: string;
}

const LEGACY_PREFIX = 'U2FsdGVkX1';

async function rawCredentialValue(ctx: CycleContext, credId: string): Promise<string> {
	return await dbQuery(ctx, `SELECT data FROM credentials_entity WHERE id='${credId}';`);
}

export async function getActiveKeyId(ctx: CycleContext): Promise<string> {
	return await dbQuery(
		ctx,
		"SELECT id FROM deployment_key WHERE type='data_encryption' AND status='active' AND algorithm='aes-256-gcm';",
	);
}

/** The raw column must start with "<keyId>:". */
export async function assertPrefixed(
	ctx: CycleContext,
	credId: string,
	keyId: string,
	label: string,
): Promise<void> {
	const raw = await rawCredentialValue(ctx, credId);
	if (!raw.startsWith(`${keyId}:`)) {
		fail(
			`${label}: value is not prefixed with the expected key id`,
			`expected prefix: ${keyId}:\nraw (first 60): ${raw.slice(0, 60)}`,
		);
	}
	ok(ctx, `${label}: value is prefixed with key id ${keyId}`);
}

export async function assertLegacyFormat(
	ctx: CycleContext,
	credId: string,
	label: string,
): Promise<void> {
	const raw = await rawCredentialValue(ctx, credId);
	if (!raw.startsWith(LEGACY_PREFIX)) {
		fail(`${label}: new write is not legacy-format`, `raw (first 60): ${raw.slice(0, 60)}`);
	}
	ok(ctx, `${label}: stored in legacy format (${LEGACY_PREFIX}...)`);
}

export async function assertKeyRowCount(ctx: CycleContext, expected: number): Promise<void> {
	const count = await dbQuery(
		ctx,
		"SELECT COUNT(*) AS c FROM deployment_key WHERE type='data_encryption';",
	);
	if (count !== String(expected)) {
		fail(`expected exactly ${expected} deployment_key rows, got ${count}`);
	}
	ok(ctx, `deployment_key has exactly ${expected} rows`);
}

/**
 * Seeds one ACTIVE scheduled workflow whose HTTP node uses the seeded
 * credential against the instance's own /healthz. Every later boot then
 * exercises activation and an execution that decrypts the credential inside
 * the engine — a read-path regression fails the run even when the
 * credentials GET endpoint still works.
 *
 * Variables and SSO settings are deliberately absent: on the published
 * docker images they are license-gated (the e2e feature stub does not ship
 * in the docker dist), so those journeys live behind a real license.
 */
export async function seedJourneys(
	ctx: CycleContext,
	api: RestClient,
	credentialId: string,
	credentialName: string,
): Promise<SeededJourneys> {
	const stamp = `${Date.now()}-${process.pid}`;

	step(ctx, 'seeding an active scheduled workflow bound to the credential');
	const { id: workflowId, versionId } = await api.createWorkflow({
		name: `encryption-cycle scheduled (${stamp})`,
		nodes: [
			{
				id: 'schedule-1',
				name: 'Schedule Trigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1.2,
				position: [0, 0],
				parameters: { rule: { interval: [{ field: 'seconds', secondsInterval: 2 }] } },
			},
			{
				id: 'http-1',
				name: 'Self Healthz',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [200, 0],
				parameters: {
					url: 'http://localhost:5678/healthz',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: { httpHeaderAuth: { id: credentialId, name: credentialName } },
			},
		],
		connections: {
			'Schedule Trigger': { main: [[{ node: 'Self Healthz', type: 'main', index: 0 }]] },
		},
		settings: { executionOrder: 'v1' },
		active: false,
	});
	await api.activateWorkflow(workflowId, versionId);
	ok(ctx, `workflow ${workflowId} created and activated`);

	return { workflowId };
}

/**
 * Per-boot journey checks: the workflow is still active and a fresh
 * execution completes — proving the schedule re-armed on this boot and the
 * engine decrypted the credential.
 */
export async function assertJourneys(
	ctx: CycleContext,
	api: RestClient,
	seeded: SeededJourneys,
	label: string,
): Promise<void> {
	step(ctx, `checking the scheduled workflow is active and executes (${label})`);
	const active = await api.getWorkflowActive(seeded.workflowId);
	if (!active) fail(`${label}: seeded workflow is no longer active`);

	const countSql = `SELECT COUNT(*) AS c FROM execution_entity WHERE "workflowId"='${seeded.workflowId}' AND status='success';`;
	const baseline = Number(await dbQuery(ctx, countSql));
	const waitStarted = Date.now();
	const deadline = waitStarted + 30_000;
	let current = baseline;
	while (current <= baseline && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		current = Number(await dbQuery(ctx, countSql));
	}
	if (current <= baseline) {
		const lastStatus = await dbQuery(
			ctx,
			`SELECT status FROM execution_entity WHERE "workflowId"='${seeded.workflowId}' ORDER BY id DESC LIMIT 1;`,
		);
		fail(
			`${label}: no new successful execution within 30s`,
			`successful executions: ${baseline} (unchanged), last status: ${lastStatus || '(none)'}`,
		);
	}
	// Time from "instance is up" polling start until a fresh execution landed:
	// activation + schedule fire + engine decrypt, end to end.
	metric(ctx, 'journey_exec_ms', ctx.phase, Date.now() - waitStarted);
	ok(
		ctx,
		`a scheduled execution succeeded on this boot (engine decrypted the credential; ${baseline} -> ${current})`,
	);
}
