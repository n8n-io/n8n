import { expect, test } from '@playwright/test';
import { formatBucketName } from 'n8n-containers/services/localstack';

import { assertN8nImage, runDeploymentCell } from './probe';

test(
	'S3 binary data storage',
	{
		tag: '@cell:ENV-08',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		expect(
			Boolean(process.env.N8N_LICENSE_ACTIVATION_KEY || process.env.N8N_LICENSE_CERT),
			'N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT is required for S3 binary data storage',
		).toBe(true);

		const bucket = formatBucketName('n8n-env08-binary');

		await runDeploymentCell({
			stack: {
				workers: 1,
				services: ['localstack'],
				env: {
					N8N_DEFAULT_BINARY_DATA_MODE: 's3',
					N8N_EXTERNAL_STORAGE_S3_BUCKET_NAME: bucket,
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
					stack.serviceResults.localstack,
					'Expected a LocalStack container in the stack',
				).toBeDefined();
				expect(
					stack.findContainers(/-n8n-worker-1$/)[0],
					'Expected a worker n8n container in the stack',
				).toBeDefined();

				const objects = await stack.services.localstack.s3.listObjects(bucket);
				expect(
					objects.length,
					`Expected binary objects in LocalStack S3 bucket "${bucket}"`,
				).toBeGreaterThan(0);

				const { workflowId, payload, extracted } = probeOutput.binary;
				const { executionId } = probeOutput.execution;
				const workflowPrefix = `workflows/${workflowId}/executions/`;
				const executionPrefix = `${workflowPrefix}${executionId}/binary_data/`;
				expect(
					objects.every((object) => object.key.startsWith(workflowPrefix)),
					`Expected S3 keys under "${workflowPrefix}", got: ${objects.map((object) => object.key).join(', ')}`,
				).toBe(true);
				expect(
					objects.some((object) => object.key.startsWith(executionPrefix)),
					`Expected a worker-written S3 object under "${executionPrefix}", got: ${objects.map((object) => object.key).join(', ')}`,
				).toBe(true);

				const storedPayloads = await Promise.all(
					objects.map(
						async (object) => await stack.services.localstack.s3.getObjectText(bucket, object.key),
					),
				);
				expect(
					storedPayloads,
					`Expected uploaded binary payload "${payload}" in LocalStack S3 bucket "${bucket}"`,
				).toContain(payload);
				expect(
					storedPayloads,
					`Expected worker-written binary payload "${extracted}" in LocalStack S3 bucket "${bucket}"`,
				).toContain(extracted);
			},
			cleanup: async (stack) => {
				await stack.services.localstack.s3.deleteBucket(bucket);
			},
		});
	},
);
