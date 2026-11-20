import * as path from 'node:path';

import type { Report } from './types.js';

export function toJSON(report: Report, rootDir?: string): string {
	const cleaned = rootDir
		? {
				...report,
				results: report.results.map((result) => ({
					...result,
					violations: result.violations.map((v) => ({
						...v,
						file: path.relative(rootDir, v.file),
					})),
				})),
			}
		: report;

	return JSON.stringify(cleaned, null, 2);
}
