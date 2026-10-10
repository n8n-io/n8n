import { expect, test } from 'n8n-playwright/cli';
import { attachMetric } from 'n8n-playwright/metrics';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

import {
	DIVE_VERSION,
	diveReportSchema,
	formatDiveSummary,
	summarizeDiveReport,
} from './dive-results';

const dive = process.env.DIVE_BINARY ?? 'dive';
const imageMetadataSchema = z.object({ image: z.object({ name: z.string(), ref: z.string() }) });
const imageIdentitySchema = z.object({
	Id: z.string().startsWith('sha256:'),
	Os: z.string(),
	Architecture: z.string(),
});

test(
	'image layer efficiency',
	{ annotation: [{ type: 'owner', description: 'Cloud Platform' }] },
	async ({ cli }, testInfo) => {
		const { image } = imageMetadataSchema.parse(testInfo.project.metadata);
		const { stdout: version } = await cli.run(dive, ['--version'], { timeout: 10_000 });
		expect(version.trim(), 'Use the pinned Dive version for comparable measurements').toBe(
			`dive ${DIVE_VERSION}`,
		);

		// Inspect first so a missing local image fails instead of pulling a different image.
		const { stdout: identityJson } = await cli.run(
			'docker',
			[
				'image',
				'inspect',
				image.ref,
				'--format',
				'{"Id":{{json .Id}},"Os":{{json .Os}},"Architecture":{{json .Architecture}}}',
			],
			{ timeout: 30_000 },
		);
		const identity = imageIdentitySchema.parse(JSON.parse(identityJson));
		const reportPath = testInfo.outputPath('dive.json');
		const platform = `${identity.Os}/${identity.Architecture}`;
		testInfo.annotations.push(
			{ type: 'image', description: image.ref },
			{ type: 'platform', description: platform },
			{ type: 'tool', description: `Dive ${DIVE_VERSION}` },
		);

		await testInfo.attach('image-identity', {
			body: JSON.stringify({ ...image, ...identity, diveVersion: DIVE_VERSION }, null, 2),
			contentType: 'application/json',
		});

		await cli.run(dive, [identity.Id, '--source', 'docker', '--json', reportPath], {
			title: 'Analyze image layers with Dive',
			timeout: 240_000,
		});

		await testInfo.attach('dive-report', { path: reportPath, contentType: 'application/json' });
		const report = diveReportSchema.parse(JSON.parse(await readFile(reportPath, 'utf8')));
		const summary = summarizeDiveReport(report);
		await testInfo.attach('image-efficiency-summary', {
			body: formatDiveSummary(image.ref, platform, summary),
			contentType: 'text/plain',
		});

		const dimensions = {
			image: image.name,
			platform,
			dive_version: DIVE_VERSION,
		};
		await attachMetric(
			testInfo,
			`docker-image-layer-size-${image.name}`,
			summary.sizeBytes / 1024 / 1024,
			'MB',
			dimensions,
		);
		await attachMetric(
			testInfo,
			`docker-image-wasted-size-${image.name}`,
			summary.wastedBytes / 1024 / 1024,
			'MB',
			dimensions,
		);
		await attachMetric(
			testInfo,
			`docker-image-efficiency-${image.name}`,
			summary.efficiencyPercent,
			'%',
			dimensions,
		);
		await attachMetric(
			testInfo,
			`docker-image-layer-count-${image.name}`,
			summary.layerCount,
			'count',
			dimensions,
		);
	},
);
