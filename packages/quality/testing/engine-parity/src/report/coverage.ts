import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ParityCase } from '../grammar/ir';
import type { Diff } from '../oracle/compare';
import { canonical } from '../oracle/normalize';

type Example = { count: number; message: string; example: unknown };

/**
 * Counts what one rule set generated and what the engines did with it. Each
 * case counts once, so shrink runs do not change the numbers.
 */
export class CoverageReport {
	private readonly seen = new Set<string>();

	cases = 0;

	discarded = 0;

	readonly discardReasons: Record<string, number> = {};

	ran = 0;

	readonly nodes: Record<string, number> = {};

	readonly combinators: Record<string, number> = {};

	readonly warnings: Record<string, Example> = {};

	readonly findings: Record<string, Example> = {};

	readonly failures: Record<string, Example> = {};

	readonly knownDivergences: Record<string, number> = {};

	readonly repros: Record<string, string> = {};

	constructor(
		readonly rules: string,
		readonly seed: number,
	) {}

	/** Returns false when the case was seen before, for example in a shrink. */
	recordCase(parityCase: ParityCase, discardCodes: string[]): boolean {
		const key = canonical(parityCase.ir);
		if (this.seen.has(key)) return false;
		this.seen.add(key);
		this.cases += 1;
		for (const irNode of parityCase.ir.nodes) {
			this.nodes[irNode.catalogId] = (this.nodes[irNode.catalogId] ?? 0) + 1;
			this.combinators[irNode.via] = (this.combinators[irNode.via] ?? 0) + 1;
		}
		if (discardCodes.length > 0) {
			this.discarded += 1;
			for (const code of new Set(discardCodes)) {
				this.discardReasons[code] = (this.discardReasons[code] ?? 0) + 1;
			}
		} else {
			this.ran += 1;
		}
		return true;
	}

	private add(
		target: Record<string, Example>,
		signature: string,
		message: string,
		example: unknown,
	) {
		const entry = target[signature];
		if (entry) entry.count += 1;
		else target[signature] = { count: 1, message, example };
	}

	recordWarning(signature: string, diff: Diff) {
		this.add(this.warnings, signature, diff.message, diff);
	}

	recordFinding(signature: string, message: string, example: unknown) {
		this.add(this.findings, signature, message, example);
	}

	recordFailure(signature: string, diff: Diff) {
		this.add(this.failures, signature, diff.message, diff);
	}

	recordKnown(id: string) {
		this.knownDivergences[id] = (this.knownDivergences[id] ?? 0) + 1;
	}

	private percent(part: number): string {
		return this.cases === 0 ? '0%' : `${((100 * part) / this.cases).toFixed(1)}%`;
	}

	refusedByV2(): number {
		return Object.entries(this.findings)
			.filter(([signature]) => signature.startsWith('E.v2.refused'))
			.reduce((sum, [, entry]) => sum + entry.count, 0);
	}

	toJSON() {
		return {
			rules: this.rules,
			seed: this.seed,
			cases: this.cases,
			ran: this.ran,
			discarded: this.discarded,
			discardedPercent: this.percent(this.discarded),
			refusedByV2Percent: this.percent(this.refusedByV2()),
			discardReasons: this.discardReasons,
			nodes: this.nodes,
			combinators: this.combinators,
			failures: this.failures,
			findings: this.findings,
			warnings: this.warnings,
			knownDivergences: this.knownDivergences,
			repros: this.repros,
		};
	}

	toMarkdown(): string {
		const table = (title: string, rows: Record<string, number | Example>) => {
			const entries = Object.entries(rows).sort(([a], [b]) => a.localeCompare(b));
			if (entries.length === 0) return `### ${title}\n\nNone.\n`;
			const lines = entries.map(([key, value]) =>
				typeof value === 'number'
					? `| \`${key}\` | ${value} |`
					: `| \`${key}\` | ${value.count} | ${value.message.replace(/\|/g, '\\|')} |`,
			);
			const header =
				typeof entries[0][1] === 'number'
					? '| Key | Count |\n|---|---|'
					: '| Signature | Count | Example |\n|---|---|---|';
			return `### ${title}\n\n${header}\n${lines.join('\n')}\n`;
		};
		return [
			`## Engine parity: rule set \`${this.rules}\``,
			'',
			`Seed: \`${this.seed}\`. Replay with \`PARITY_SEED=${this.seed} PARITY_RULES=${this.rules}\`.`,
			'',
			'| Cases | Ran on both engines | Discarded by the eligibility check | Refused by v2 |',
			'|---|---|---|---|',
			`| ${this.cases} | ${this.ran} | ${this.discarded} (${this.percent(this.discarded)}) | ${this.refusedByV2()} (${this.percent(this.refusedByV2())}) |`,
			'',
			table('Failures', this.failures),
			table('Findings (level E)', this.findings),
			table('Warnings', this.warnings),
			table('Known divergences', this.knownDivergences),
			table('Discard reasons', this.discardReasons),
			table('Nodes', this.nodes),
			table('Combinators', this.combinators),
			table(
				'Repro files',
				Object.fromEntries(
					Object.entries(this.repros).map(([sig, file]) => [`${sig}: ${file}`, 1]),
				),
			),
		].join('\n');
	}

	write(dir: string): string {
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'summary.json'), `${JSON.stringify(this, null, 2)}\n`);
		const file = join(dir, 'summary.md');
		writeFileSync(file, `${this.toMarkdown()}\n`);
		return file;
	}
}
