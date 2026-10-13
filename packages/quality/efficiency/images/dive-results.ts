import { z } from 'zod';

export const DIVE_VERSION = '0.13.1';

export const diveReportSchema = z.object({
	layer: z
		.array(
			z.object({
				index: z.number().int().nonnegative(),
				digestId: z.string(),
				sizeBytes: z.number().int().nonnegative(),
				command: z.string(),
			}),
		)
		.min(1),
	image: z.object({
		sizeBytes: z.number().int().positive(),
		inefficientBytes: z.number().int().nonnegative(),
		efficiencyScore: z.number().min(0).max(1),
		fileReference: z.array(
			z.object({
				count: z.number().int().positive(),
				sizeBytes: z.number().int().nonnegative(),
				file: z.string(),
			}),
		),
	}),
});

export function summarizeDiveReport(report: z.infer<typeof diveReportSchema>) {
	return {
		sizeBytes: report.image.sizeBytes,
		wastedBytes: report.image.inefficientBytes,
		efficiencyPercent: report.image.efficiencyScore * 100,
		layerCount: report.layer.length,
		largestLayers: [...report.layer].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 10),
		largestWastedFiles: [...report.image.fileReference]
			.sort((a, b) => b.sizeBytes - a.sizeBytes)
			.slice(0, 20),
	};
}

export function formatDiveSummary(
	image: string,
	platform: string,
	summary: ReturnType<typeof summarizeDiveReport>,
): string {
	const mib = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
	return [
		`Image: ${image}`,
		`Platform: ${platform}`,
		`Layer content: ${mib(summary.sizeBytes)}`,
		`Estimated waste: ${mib(summary.wastedBytes)}`,
		`Efficiency: ${summary.efficiencyPercent.toFixed(2)}%`,
		`Filesystem layers: ${summary.layerCount}`,
		'',
		'Largest layers:',
		...summary.largestLayers.map((layer) => `${mib(layer.sizeBytes)}  ${layer.command}`),
		'',
		'Largest wasted files:',
		...summary.largestWastedFiles.map((file) => `${mib(file.sizeBytes)}  ${file.file}`),
	].join('\n');
}
