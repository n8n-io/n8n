/* eslint-disable import-x/no-default-export */
export default async () => {
	const { createVitestConfig } = await import('@n8n/vitest-config/node');

	return createVitestConfig({
		include: ['test/**/*.test.ts'],
	});
};
