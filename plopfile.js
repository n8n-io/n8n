export default function (
	/** @type {import('plop').NodePlopAPI} */
	plop
) {
	// Declare generators
	plop.setGenerator('credentials', require('./plop/credentials'));
};
