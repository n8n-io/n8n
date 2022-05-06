export default function (
	/** @type {import('plop').NodePlopAPI} */
	plop
) {
	// Add plugins
	plop.load('plop-action-eslint');

	// Declare generators
	plop.setGenerator('credentials', require('./plop/credentials'));
};
