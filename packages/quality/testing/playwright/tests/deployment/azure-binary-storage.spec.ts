import { expect, test } from '@playwright/test';
import { formatBlobContainerName } from 'n8n-containers/services/azurite';

import { assertN8nImage, runDeploymentCell } from './probe';

test(
	'Azure Blob binary data storage',
	{
		tag: '@cell:ENV-09',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		expect(
			Boolean(process.env.N8N_LICENSE_ACTIVATION_KEY || process.env.N8N_LICENSE_CERT),
			'N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT is required for Azure Blob binary data storage',
		).toBe(true);

		const containerName = formatBlobContainerName('n8n-env09-binary');

		await runDeploymentCell({
			stack: {
				workers: 1,
				services: ['azurite'],
				env: {
					N8N_DEFAULT_BINARY_DATA_MODE: 'azure',
					N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME: containerName,
				},
			},
			probe: async ({ probe }) => {
				const binary = await probe.roundTripBinary();
				const execution = await probe.readExecution(binary.workflowId);
				return { binary, execution };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.azurite,
					'Expected an Azurite container in the stack',
				).toBeDefined();
				expect(
					stack.findContainers(/-n8n-worker-1$/)[0],
					'Expected a worker n8n container in the stack',
				).toBeDefined();

				const blobs = await stack.services.azurite.blob.listBlobs(containerName);
				expect(
					blobs.length,
					`Expected binary blobs in Azurite container "${containerName}"`,
				).toBeGreaterThan(0);

				const { workflowId, payload, extracted } = probeOutput.binary;
				const { executionId } = probeOutput.execution;
				const workflowPrefix = `workflows/${workflowId}/executions/`;
				const executionPrefix = `${workflowPrefix}${executionId}/binary_data/`;
				expect(
					blobs.every((blob) => blob.name.startsWith(workflowPrefix)),
					`Expected Azure blob names under "${workflowPrefix}", got: ${blobs.map((blob) => blob.name).join(', ')}`,
				).toBe(true);
				expect(
					blobs.some((blob) => blob.name.startsWith(executionPrefix)),
					`Expected a worker-written Azure blob under "${executionPrefix}", got: ${blobs.map((blob) => blob.name).join(', ')}`,
				).toBe(true);

				const storedPayloads = await Promise.all(
					blobs.map(
						async (blob) =>
							await stack.services.azurite.blob.downloadBlobText(containerName, blob.name),
					),
				);
				expect(
					storedPayloads,
					`Expected uploaded binary payload "${payload}" in Azurite container "${containerName}"`,
				).toContain(payload);
				expect(
					storedPayloads,
					`Expected worker-written binary payload "${extracted}" in Azurite container "${containerName}"`,
				).toContain(extracted);
			},
			cleanup: async (stack) => {
				await stack.services.azurite.blob.deleteContainer(containerName);
			},
		});
	},
);
