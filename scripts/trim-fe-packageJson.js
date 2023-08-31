const { writeFileSync } = require('fs')
const { resolve } = require('path');
const baseDir = resolve(__dirname, '..');

const trimPackageJson = (packageName) => {
	const filePath = resolve(baseDir, 'packages', packageName, 'package.json');
	const { scripts, peerDependencies, devDependencies, dependencies, ...packageJson } = require(filePath);
	writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
}

trimPackageJson('design-system')
trimPackageJson('editor-ui')
