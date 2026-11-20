/**
 * Filter helpers shared by more than one plane.
 *
 * The OT and CSAM planes build completely different filter documents, but both
 * let a user pick how rows join, and both accept the same free-typed value.
 */
export function normalizeJoin(value: string): 'AND' | 'OR' {
	return value.trim().toUpperCase() === 'OR' ? 'OR' : 'AND';
}
