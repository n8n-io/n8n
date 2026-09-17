export const odataStringLiteral = (value: unknown): string =>
	`'${String(value ?? '').replaceAll("'", "''")}'`;
