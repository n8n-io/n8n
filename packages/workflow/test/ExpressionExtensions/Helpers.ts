import { Expression, IDataObject, Workflow } from '../../src';
import * as Helpers from '../Helpers';

export const TEST_TIMEZONE = 'America/New_York';

export const nodeTypes = Helpers.NodeTypes();
export const workflow = new Workflow({
	nodes: [
		{
			name: 'node',
			typeVersion: 1,
			type: 'test.set',
			id: 'uuid-1234',
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
	active: false,
	nodeTypes,
});
export const expression = new Expression(workflow);

export const evaluate = (value: string, values?: IDataObject[]) =>
	expression.getParameterValue(
		value,
		null,
		0,
		0,
		'node',
		values?.map((v) => ({ json: v })) ?? [],
		'manual',
		TEST_TIMEZONE,
		{},
	);

export const getLocalISOString = (date: Date) => {
	const offset = date.getTimezoneOffset();
	const offsetAbs = Math.abs(offset);
	const isoString = new Date(date.getTime() - offset * 60 * 1000).toISOString();
	const hours = String(Math.floor(offsetAbs / 60)).padStart(2, '0');
	const minutes = String(offsetAbs % 60).padStart(2, '0');
	return `${isoString.slice(0, -1)}${offset > 0 ? '-' : '+'}${hours}:${minutes}`;
};
