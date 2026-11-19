/**
 * Descriptive statistics for a set of timing samples. Percentiles use linear
 * interpolation between the two nearest ranks (the R-7 definition that
 * spreadsheets and NumPy use), so p80 of 10 samples does not snap to a rank.
 */
export interface Stats {
	count: number;
	min: number;
	max: number;
	avg: number;
	median: number;
	p80: number;
	p95: number;
	stddev: number;
	/** Coefficient of variation: stddev / avg. A stability score, lower is steadier. */
	cv: number;
}

export function percentile(values: number[], p: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const rank = (sorted.length - 1) * p;
	const lower = Math.floor(rank);
	const upper = Math.ceil(rank);
	const weight = rank - lower;
	return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

export function computeStats(values: number[]): Stats {
	if (values.length === 0) {
		return { count: 0, min: 0, max: 0, avg: 0, median: 0, p80: 0, p95: 0, stddev: 0, cv: 0 };
	}
	const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
	const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
	const stddev = Math.sqrt(variance);
	return {
		count: values.length,
		min: Math.min(...values),
		max: Math.max(...values),
		avg,
		median: percentile(values, 0.5),
		p80: percentile(values, 0.8),
		p95: percentile(values, 0.95),
		stddev,
		cv: avg === 0 ? 0 : stddev / avg,
	};
}
