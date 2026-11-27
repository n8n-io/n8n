import { expect, test } from '@playwright/test';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import { nanoid } from 'nanoid';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	assertN8nImage,
	type BinaryRoundTripResult,
	type ReadExecutionResult,
	runDeploymentCell,
	type WebhookRunResult,
} from './probe';
import {
	CONTAINER_HOME_DIR,
	downloadBinaryData,
	extractBinaryIds,
	extractEditFieldsEcho,
	inspectStorageMigrationState,
	parseMajorVersion,
	readCredentialWithData,
	readExecutionById,
	readWorkflow,
	requireMainContainer,
	resolveHostUser,
	resolveUpgradeFromImage,
	stripFilesystemPrefix,
} from './upgrade-2x-to-3x-helpers';

interface UpgradeProbeOutput {
	versionBefore: string;
	versionAfter: string;
	webhook: WebhookRunResult;
	seededWorkflowName: string;
	webhookExecution: ReadExecutionResult;
	credential: { id: string; name: string };
	credentialHeaderName: string;
	binary: BinaryRoundTripResult;
	binaryExecution: ReadExecutionResult;
	writtenBinaryId: string;
	binaryRelativePath: string;
}

test(
	'Upgrade standalone SQLite from 2.x stable to 3.x nightly',
	{
		tag: '@cell:PLT-04',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		const fromImage = resolveUpgradeFromImage();
		const targetImage = TEST_CONTAINER_IMAGES.n8n;
		const hostUser = resolveHostUser();
		const homeDir = mkdtempSync(join(tmpdir(), 'n8n-upgrade-2x-3x-'));

		// Recent 2.x releases default fresh installs to ~/.n8n/storage, while keeping
		// ~/.n8n/binaryData when it already exists. Pre-creating binaryData/ reproduces
		// an existing 2.x deployment so 2.x writes there and 3.x renames it on boot.
		mkdirSync(join(homeDir, '.n8n', 'binaryData'), { recursive: true });

		try {
			await runDeploymentCell<UpgradeProbeOutput>({
				stack: {
					image: fromImage,
					userHomeHostDir: homeDir,
					user: hostUser,
					startupTimeoutMs: 180_000,
					env: {
						HOME: CONTAINER_HOME_DIR,
						N8N_RUNNERS_MODE: 'internal',
						N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
					},
				},
				probe: async ({ stack, probe, version: versionBefore }) => {
					assertN8nImage(stack, fromImage);
					expect(
						parseMajorVersion(versionBefore),
						`Expected initial deployment to run n8n 2.x, got "${versionBefore}" (image: ${fromImage})`,
					).toBe(2);

					const webhook = await probe.runWebhook();
					const seededWorkflow = await readWorkflow(probe, webhook.workflowId);
					const webhookExecution = await probe.readExecution(webhook.workflowId);

					const credentialToken = nanoid(10);
					const credentialHeaderName = `X-Upgrade-Probe-${credentialToken}`;
					const credential = await probe.createCredential({
						name: `Upgrade Probe Header Auth (${credentialToken})`,
						type: 'httpHeaderAuth',
						data: {
							name: credentialHeaderName,
							value: `upgrade-secret-${nanoid(12)}`,
						},
					});
					const seededCredential = await readCredentialWithData(probe, credential.id);
					expect(
						seededCredential.data.name,
						'Expected seeded credential to decrypt before upgrade',
					).toBe(credentialHeaderName);

					const binary = await probe.roundTripBinary();
					const binaryExecution = await probe.readExecution(binary.workflowId);
					const binaryIds = extractBinaryIds(binaryExecution.runData);
					const writtenBinaryId = binaryIds['Convert to File.written'] ?? '';
					expect(
						writtenBinaryId,
						`Expected seeded binary to use filesystem storage on 2.x, got "${writtenBinaryId}"`,
					).toMatch(
						new RegExp(
							`^filesystem(?:-v2)?:workflows/${binary.workflowId}/executions/${binaryExecution.executionId}/binary_data/[A-Za-z0-9-]+$`,
						),
					);
					const binaryRelativePath = stripFilesystemPrefix(writtenBinaryId);

					const mainBefore = requireMainContainer(stack);
					const storageBefore = await inspectStorageMigrationState(mainBefore, binaryRelativePath);
					expect(
						storageBefore.binaryDataDirExists,
						'Expected ~/.n8n/binaryData to exist on 2.x before upgrade',
					).toBe(true);
					expect(
						storageBefore.storageDirExists,
						'Expected ~/.n8n/storage to be absent on 2.x before upgrade',
					).toBe(false);
					expect(
						storageBefore.binaryFileInBinaryData,
						'Expected 2.x to store the seeded binary file under ~/.n8n/binaryData',
					).toEqual({
						exists: true,
						content: binary.extracted,
						metadataExists: true,
					});
					expect(
						storageBefore.fsStorageMigrated,
						'Expected ~/.n8n/config not to mark fsStorageMigrated before upgrade',
					).not.toBe(true);

					const binaryBeforeUpgrade = await downloadBinaryData(probe, writtenBinaryId);
					expect(
						binaryBeforeUpgrade,
						'Expected 2.x REST API to serve the seeded binary file before upgrade',
					).toBe(binary.extracted);

					await stack.replaceN8N({ image: targetImage });
					const { version: versionAfter } = await probe.signIn();
					test
						.info()
						.annotations.push(
							{ type: 'upgrade-target-image', description: targetImage },
							{ type: 'upgrade-target-version', description: versionAfter },
						);

					return {
						versionBefore,
						versionAfter,
						webhook,
						seededWorkflowName: seededWorkflow.name,
						webhookExecution,
						credential,
						credentialHeaderName,
						binary,
						binaryExecution,
						writtenBinaryId,
						binaryRelativePath,
					};
				},
				check: async ({ stack, probe, probeOutput }) => {
					const mainAfter = requireMainContainer(stack);
					const storageAfter = await inspectStorageMigrationState(
						mainAfter,
						probeOutput.binaryRelativePath,
					);
					expect(
						storageAfter.binaryDataDirExists,
						'Expected ~/.n8n/binaryData to be removed after renaming to ~/.n8n/storage on 3.x',
					).toBe(false);
					expect(
						storageAfter.storageDirExists,
						'Expected ~/.n8n/storage to exist after 3.x renamed ~/.n8n/binaryData',
					).toBe(true);
					expect(
						storageAfter.binaryFileInBinaryData,
						'Expected seeded binary file to no longer reside in ~/.n8n/binaryData',
					).toEqual({
						exists: false,
						content: '',
						metadataExists: false,
					});
					expect(
						storageAfter.binaryFileInStorage,
						'Expected seeded binary file and metadata to survive rename into ~/.n8n/storage',
					).toEqual({
						exists: true,
						content: probeOutput.binary.extracted,
						metadataExists: true,
					});
					expect(
						storageAfter.fsStorageMigrated,
						'Expected ~/.n8n/config to record fsStorageMigrated: true after 3.x upgrade',
					).toBe(true);

					assertN8nImage(stack, targetImage);
					expect(
						parseMajorVersion(probeOutput.versionAfter),
						`Expected upgraded deployment to run n8n 3.x, got "${probeOutput.versionAfter}" (image: ${targetImage})`,
					).toBe(3);

					const downloadedBinary = await downloadBinaryData(probe, probeOutput.writtenBinaryId);
					expect(
						downloadedBinary,
						'Expected 3.x REST API to still read the seeded binary file after storage rename',
					).toBe(probeOutput.binary.extracted);

					const workflowAfter = await readWorkflow(probe, probeOutput.webhook.workflowId);
					expect(
						workflowAfter,
						'Expected seeded workflow to remain readable and active after upgrade',
					).toEqual({
						id: probeOutput.webhook.workflowId,
						name: probeOutput.seededWorkflowName,
						active: true,
					});

					const credentialAfter = await readCredentialWithData(probe, probeOutput.credential.id);
					expect(credentialAfter.id, 'Expected seeded credential id to match after upgrade').toBe(
						probeOutput.credential.id,
					);
					expect(
						credentialAfter.name,
						'Expected seeded credential name to match after upgrade',
					).toBe(probeOutput.credential.name);
					expect(
						credentialAfter.type,
						'Expected seeded credential type to match after upgrade',
					).toBe('httpHeaderAuth');
					expect(
						credentialAfter.data.name,
						'Expected seeded credential to remain readable and decrypt after upgrade',
					).toBe(probeOutput.credentialHeaderName);

					const executionAfter = await readExecutionById(
						probe,
						probeOutput.webhookExecution.executionId,
					);
					expect(executionAfter.id, 'Expected seeded execution id to match after upgrade').toBe(
						probeOutput.webhookExecution.executionId,
					);
					expect(
						executionAfter.workflowId,
						'Expected seeded execution workflowId to match after upgrade',
					).toBe(probeOutput.webhook.workflowId);
					expect(
						executionAfter.finished,
						'Expected seeded execution to remain finished after upgrade',
					).toBe(true);
					expect(
						executionAfter.status,
						'Expected seeded execution status to remain success after upgrade',
					).toBe('success');
					expect(
						extractEditFieldsEcho(executionAfter.runData),
						'Expected seeded execution runData to remain readable after upgrade',
					).toBe(`probe:${probeOutput.webhook.token}`);

					const postUpgradeToken = nanoid(10);
					const webhookResponse = await probe.triggerWebhook(probeOutput.webhook.webhookPath, {
						query: { token: postUpgradeToken },
					});
					const webhookText = await webhookResponse.text();
					expect(
						webhookResponse.ok(),
						`Expected seeded active webhook to respond after upgrade (status ${webhookResponse.status()}): ${webhookText.slice(0, 400)}`,
					).toBe(true);
					const webhookBody: unknown = JSON.parse(webhookText);
					expect(
						webhookBody,
						`Expected seeded active webhook to echo post-upgrade token, got: ${webhookText.slice(0, 400)}`,
					).toMatchObject({
						echo: `probe:${postUpgradeToken}`,
					});
				},
			});
		} finally {
			rmSync(homeDir, { recursive: true, force: true });
		}
	},
);
