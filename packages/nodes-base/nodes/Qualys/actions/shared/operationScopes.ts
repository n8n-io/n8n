import { operationsWhere } from '../resources';

/**
 * Which operations each block of parameters belongs to.
 *
 * Operation values are globally unique, so `displayOptions` can key on the
 * operation alone and never has to restate the resource. Deriving these lists
 * from the endpoint table is what stops the UI and the router from drifting
 * apart as endpoints are added.
 */
export const LIST_OPS = operationsWhere((operation) => operation.kind === 'list');
export const COUNT_OPS = operationsWhere((operation) => operation.kind === 'count');
export const GET_OPS = operationsWhere((operation) => operation.kind === 'get');
export const QQL_OPS = operationsWhere((operation) => operation.plane === 'ot');
export const CRITERIA_OPS = operationsWhere(
	(operation) => operation.filterShape === 'assetCriteria',
);
export const COMPONENT_OPS = operationsWhere(
	(operation) => operation.filterShape === 'componentFilter',
);
// A count reads none of the Asset Management options, so it does not show them.
export const CSAM_OPS = operationsWhere(
	(operation) => operation.plane === 'csam' && operation.kind !== 'count',
);
export const TRUNCATABLE_OPS = operationsWhere((operation) => operation.truncatable);
export const ID_WINDOWED_OPS = operationsWhere((operation) => operation.idWindowed);

/** Operations whose Additional Fields collection is the named node property. */
export const usingOptions = (property: string): string[] =>
	operationsWhere((operation) => operation.optionsProperty === property);
