import { YouTube } from './nodes/Google/YouTube/YouTube.node';

try {
	const node = new YouTube();
	console.log('Successfully instantiated YouTube node');
	console.log('Description:', node.description.displayName);
} catch (error) {
	console.error('Failed to instantiate YouTube node:', error);
	process.exit(1);
}
