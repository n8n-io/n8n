let referencedMethods;
let definedMethods;

try {
	referencedMethods = require('../dist/methods/referenced.json');
	definedMethods = require('../dist/methods/defined.json');
} catch (error) {
	console.error(
		'Failed to find methods to validate. Please run `npm run n8n-generate-ui-types` first.',
	);
	process.exit(1);
}

const compareMethods = (base, other) => {
	const result = [];

	for (const [nodeName, methods] of Object.entries(base)) {
		if (nodeName in other) {
			const found = methods.filter((item) => !other[nodeName].includes(item));

			if (found.length > 0) result.push({ [nodeName]: found });
		}
	}

	return result;
};

const referencedButUndefined = compareMethods(referencedMethods, definedMethods);

if (referencedButUndefined.length > 0) {
	console.error('ERROR: The following load options methods are referenced but undefined.');
	console.error('Please fix or remove the references or define the methods.');
	console.error(referencedButUndefined);
	process.exit(1);
}

const definedButUnused = compareMethods(definedMethods, referencedMethods);

if (definedButUnused.length > 0) {
	console.warn('Warning: The following load options methods are defined but unused.');
	console.warn('Please consider using or removing the methods.');
	console.warn(definedButUnused);
}
