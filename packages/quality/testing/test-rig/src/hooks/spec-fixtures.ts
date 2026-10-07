/** Hook specs that both the host schema and the preload validator must accept or reject. */
const base = { file: 'pkg/dist/service.js', target: 'Service.prototype', method: 'work' };

export const VALID_SPECS: unknown[] = [
	{ ...base, point: 'minimal' },
	{ ...base, point: 'exports-target', target: '' },
	{
		...base,
		point: 'every-field',
		kind: 'fault',
		arm: 'always',
		once: false,
		scope: { file: 'pkg/dist/runner.js', target: 'Runner.prototype', method: 'run' },
		where: [
			{ path: 'args.0.name', equals: 'x' },
			{ path: 'args.1', truthy: true },
		],
		detail: { id: 'args.0.id' },
		phase: 'after',
		returns: { ok: true },
		async: false,
		preserve: ['cancel'],
		message: 'boom',
		roles: ['main', 'worker'],
		lazy: true,
	},
];

export const INVALID_SPECS: Array<{ spec: unknown; field: string }> = [
	{ spec: { ...base, point: 'bad point!' }, field: 'point' },
	{ spec: { ...base, point: 'no-file', file: '' }, field: 'file' },
	{ spec: { point: 'no-target', file: base.file, method: 'work' }, field: 'target' },
	{ spec: { ...base, point: 'no-method', method: '' }, field: 'method' },
	{ spec: { ...base, point: 'bad-kind', kind: 'explode' }, field: 'kind' },
	{ spec: { ...base, point: 'bad-arm', arm: 'never' }, field: 'arm' },
	{ spec: { ...base, point: 'bad-phase', phase: 'during' }, field: 'phase' },
	{ spec: { ...base, point: 'bad-once', once: 'yes' }, field: 'once' },
	{ spec: { ...base, point: 'bad-scope', scope: { file: 'x' } }, field: 'scope' },
	{ spec: { ...base, point: 'bad-where', where: [{ equals: 1 }] }, field: 'where' },
	{ spec: { ...base, point: 'bad-detail', detail: { id: 1 } }, field: 'detail' },
	{ spec: { ...base, point: 'bad-preserve', preserve: 'cancel' }, field: 'preserve' },
	{ spec: { ...base, point: 'unknown-field', colour: 'red' }, field: 'colour' },
];
