import type { TestInfo } from '@playwright/test';

/** Attach a metric for the QA metrics reporter and Currents analytics. */
export async function attachMetric(
	testInfo: TestInfo,
	metricName: string,
	value: number,
	unit?: string,
	dimensions?: Record<string, string | number>,
): Promise<void> {
	await testInfo.attach(`metric:${metricName}`, {
		body: JSON.stringify({ value, unit, dimensions }),
	});

	testInfo.annotations.push({
		type: 'currents:metric',
		description: JSON.stringify({
			name: metricName,
			value,
			type: Number.isInteger(value) ? 'integer' : 'float',
			...(unit && { unit: unit.toLowerCase() }),
		}),
	});
}
