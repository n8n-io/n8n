import { analyze, collectCopies } from './collect-copies.js';
import { describeFailureCount, formatCuratedReport } from './explain-duplicates.js';

/**
 * Exit code for "the closure was checked and curated duplicates were found".
 *
 * Deliberately not 1: a missing package, an unresolvable import or a crashed toolchain also exit
 * 1, and a caller that reads 1 as a finding would report "duplication found, build continues" for
 * a run that never checked anything. 0 and 3 are the only codes this function produces, so any
 * other code means the check did not complete.
 */
export const EXIT_DUPLICATES_FOUND = 3;

/**
 * Verify a built closure at `dir`: print the curated verdict + report-only duplicates and return
 * an exit code (`EXIT_DUPLICATES_FOUND` if a curated library resolves to multiple un-allowlisted
 * physical copies).
 */
export function runVerifyClosure(dir: string): number {
	const found = collectCopies(dir);
	const { duplicates, failures } = analyze(found);

	console.log(`\nSingle-instance dependency verifier — root: ${dir}`);
	console.log('\nCurated single-instance libraries (enforced):');
	// Paths, not requirers: this runs against a pruned `pnpm deploy` closure, whose nesting is a
	// virtual store rather than "package X forced this copy".
	const report = formatCuratedReport(found, duplicates, (dup) =>
		dup.copies.map((c) => `      v${c.version}  ${c.realPath}`),
	);
	for (const line of report) console.log(line);

	const otherDups = duplicates.filter((d) => !d.isCurated);
	if (otherDups.length > 0) {
		console.log(`\nOther duplicated packages (report-only, NOT enforced — ${otherDups.length}):`);
		for (const d of otherDups) {
			console.log(
				`  ${d.name}: ${d.copies.length} copies (${d.copies.map((c) => `v${c.version}`).join(', ')})`,
			);
		}
	}

	console.log('');
	if (failures.length > 0) {
		// stdout, not stderr: the streams interleave in CI logs, and build-n8n.mjs pipes stdout — a
		// verdict on stderr can land in the middle of the list it summarises, or out of view.
		console.log(
			`FAIL: ${describeFailureCount(failures.length)}: ${failures.map((f) => f.name).join(', ')}`,
		);
		return EXIT_DUPLICATES_FOUND;
	}
	console.log('OK: no un-allowlisted curated duplicates.');
	return 0;
}
