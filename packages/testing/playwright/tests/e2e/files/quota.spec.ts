import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

// Quota limits are read from env at startup, so this suite runs against its
// own container with a tiny instance-wide cap (1 KiB) and per-file cap (600 B).
// The size-check cache is disabled so consecutive uploads see fresh totals.
test.use({
	capability: {
		env: {
			N8N_FILE_STORAGE_MAX_SIZE_BYTES: '1024',
			N8N_FILE_STORAGE_MAX_FILE_SIZE_BYTES: '600',
			N8N_FILE_STORAGE_SIZE_CHECK_CACHE_DURATION_MS: '0',
		},
	},
});

test.beforeEach(({ n8nContainer }) => {
	test.skip(!n8nContainer, 'container-only: requires file storage quota env at startup');
});

test.describe(
	'Files storage quota',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should reject a file larger than the per-file limit', async ({ api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);

			const response = await api.files.tryUploadFile(
				project.id,
				`oversized-${nanoid(8)}.txt`,
				'x'.repeat(700),
			);

			expect(response.status()).toBe(400);
			const { data } = await api.files.listFiles(project.id);
			expect(data).toHaveLength(0);
		});

		test('should surface the storage-full banner and disable uploads at quota', async ({
			n8n,
			api,
		}) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);

			// Two 512-byte files exhaust the 1024-byte instance quota exactly
			await api.files.uploadFile(project.id, `filler-one-${nanoid(8)}.txt`, 'a'.repeat(512));
			await api.files.uploadFile(project.id, `filler-two-${nanoid(8)}.txt`, 'b'.repeat(512));

			const limits = await api.files.getLimits();
			expect(limits.quotaStatus).toBe('error');

			// Further writes are rejected server-side
			const rejected = await api.files.tryUploadFile(
				project.id,
				`over-quota-${nanoid(8)}.txt`,
				'c'.repeat(10),
			);
			expect(rejected.status()).toBe(400);

			// The UI takes over with the error banner and a disabled Add file button
			await n8n.navigate.toFiles(project.id);
			await expect(n8n.files.getQuotaExceededBanner()).toBeVisible();
			await expect(n8n.files.getQuotaExceededBanner()).toContainText('File storage is full');
			await expect(n8n.files.getAddFileButton()).toBeDisabled();
		});
	},
);
