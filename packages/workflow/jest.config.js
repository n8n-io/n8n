/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config.cjs'),
	// Performance optimizations for workflow execution tests
	testTimeout: 15000, // Increased timeout for complex workflow tests
	maxWorkers: process.env.CI ? 2 : '50%', // Balanced worker allocation
};
