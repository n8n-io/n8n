import { analyze, collectCopies, distinctCopies, EXPECTED_DUPLICATES } from './collect-copies.js';
import { CURATED_LIBS } from './libs.js';

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
	const curatedDups = new Map(duplicates.filter((d) => d.isCurated).map((d) => [d.name, d]));
	console.log('\nCurated single-instance libraries (enforced):');
	for (const lib of CURATED_LIBS) {
		const dup = curatedDups.get(lib);
		if (!dup) {
			const copies = distinctCopies(found.get(lib) ?? []);
			console.log(
				`  ${lib}: ${copies.length === 0 ? 'not present' : `OK (1 copy, v${copies[0].version})`}`,
			);
			continue;
		}
		console.log(
			`  ${lib}: ${dup.allowed ? 'ALLOWED DUP' : 'FAIL'} — ${dup.copies.length} physical copies:`,
		);
		for (const c of dup.copies) console.log(`      v${c.version}  ${c.realPath}`);
		if (dup.allowed) console.log(`      allowlisted: ${EXPECTED_DUPLICATES[lib]}`);
	}

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
		console.error(
			`FAIL: curated ${failures.length === 1 ? 'library resolves' : 'libraries resolve'} to multiple physical copies: ${failures.map((f) => f.name).join(', ')}`,
		);
		return EXIT_DUPLICATES_FOUND;
	}
	console.log('OK: no un-allowlisted curated duplicates.');
	return 0;
}
