const { npm_config_user_agent: UA } = process.env;
const [packageManager] = (UA ?? '').split(' ');
const [name, version] = packageManager.split('/');
if (name !== 'pnpm') {
	const suggestion = '\033[1;92mpnpm\033[0;31m';
	console.error('\033[0;31m');
	console.error('╭───────────────────────────────────────────╮');
	console.error(`│\tPlease use ${suggestion} instead of ${name} \t    │`);
	console.error('╰───────────────────────────────────────────╯');
	console.error('\033[0m');
	process.exit(1);
}
