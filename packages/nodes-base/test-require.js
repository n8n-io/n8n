try {
	const errors = require('@n8n/errors');
	console.log('Successfully required @n8n/errors');
	console.log('Keys:', Object.keys(errors));
} catch (e) {
	console.error('Failed to require @n8n/errors');
	console.error(e);
}
