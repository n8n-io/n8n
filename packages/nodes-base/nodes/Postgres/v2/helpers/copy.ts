import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, INode } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { PgpClient, PgpDatabase } from './interfaces';
import { parsePostgresError } from './utils';

export type CopyRow = { itemIndex: number; schema: string; table: string; item: IDataObject };

type CopyGroup = { schema: string; table: string; columns: string[]; rows: CopyRow[] };

const COPY_QUERY = 'COPY $1:name.$2:name($3:name) FROM STDIN';

export function groupRows(rows: CopyRow[]): CopyGroup[] {
	const groups = rows.reduce((acc, row) => {
		const columns = Object.keys(row.item).sort();
		const key = JSON.stringify([row.schema, row.table, columns]);
		const group = acc.get(key) ?? { schema: row.schema, table: row.table, columns, rows: [] };
		group.rows.push(row);
		return acc.set(key, group);
	}, new Map<string, CopyGroup>());

	return [...groups.values()];
}

// Escaped newlines keep line N of the COPY error equal to row N
export function toCopyField(pgp: PgpClient, value: unknown): string {
	if (value === null || value === undefined) return '\\N';

	let text: string;
	if (Buffer.isBuffer(value)) {
		text = pgp.as.buffer(value, true);
	} else if (value instanceof Date) {
		text = pgp.as.date(value, true);
	} else if (typeof value === 'object') {
		text = JSON.stringify(value);
	} else {
		text = String(value);
	}

	return text
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t');
}

function* toCopyLines(pgp: PgpClient, group: CopyGroup) {
	for (const { item } of group.rows) {
		yield group.columns.map((column) => toCopyField(pgp, item[column])).join('\t') + '\n';
	}
}

// A trigger adds its own frame before the COPY frame, so read the last one
export function getFailedItemIndex(error: unknown, group?: CopyGroup) {
	if (!group || !isRecord(error) || typeof error.where !== 'string') return undefined;

	const line = error.where
		.split('\n')
		.at(-1)
		?.match(/^COPY .*?, line (\d+)\b/)?.[1];
	return line ? group.rows[Number(line) - 1]?.itemIndex : undefined;
}

export async function copyRows(
	node: INode,
	db: PgpDatabase,
	pgp: PgpClient,
	rows: CopyRow[],
): Promise<number> {
	const { from } = await import('pg-copy-streams');

	const groups = groupRows(rows);
	const useTransaction = groups.length > 1;
	const connection = await db.connect();
	let currentGroup: CopyGroup | undefined;

	try {
		if (useTransaction) await connection.none('BEGIN');

		let rowCount = 0;
		for (const group of groups) {
			currentGroup = group;
			const copyStream = from(
				pgp.as.format(COPY_QUERY, [group.schema, group.table, group.columns]),
			);
			// returns the stream, not a promise
			void connection.client.query(copyStream);
			await pipeline(Readable.from(toCopyLines(pgp, group)), copyStream);
			rowCount += copyStream.rowCount;
		}

		if (useTransaction) await connection.none('COMMIT');

		return rowCount;
	} catch (error) {
		if (useTransaction) await connection.none('ROLLBACK').catch(() => {});
		throw parsePostgresError(node, error, [], getFailedItemIndex(error, currentGroup));
	} finally {
		void connection.done();
	}
}
