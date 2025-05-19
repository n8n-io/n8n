const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取项目根目录
const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, 'n8n-package');

// 需要复制的文件和目录
const FILES_TO_COPY = [
	'package.json',
	'dist',
	'bin',
	'patches',
	'scripts',
	'pnpm-lock.yaml',
	'pnpm-workspace.yaml',
	'.gitignore',
	'index.js',
];

const workspaces = [
	'packages',
	'packages/@n8n',
	'packages/frontend',
	'packages/frontend/@n8n',
	'packages/extensions',
];

const SHELL_SCRIPT_DIR = 'shell-script';

/**
 * 递归创建目录
 */
function ensureDir(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

/**
 * 递归复制目录
 */
function copyDir(src, dest) {
	ensureDir(dest);
	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * 复制文件
 */
function copyFile(src, dest) {
	ensureDir(path.dirname(dest));
	fs.copyFileSync(src, dest);
}

/**
 * 获取所有工作区包
 */
function getWorkspacePackages() {
	const packages = [];

	for (const workspace of workspaces) {
		const packagesDir = path.join(ROOT_DIR, workspace);
		if (fs.existsSync(packagesDir)) {
			const entries = fs.readdirSync(packagesDir, { withFileTypes: true });

			for (const entry of entries) {
				if (entry.isDirectory()) {
					const packagePath = path.join(packagesDir, entry.name);
					const packageJsonPath = path.join(packagePath, 'package.json');

					// 检查是否存在 package.json 文件
					if (fs.existsSync(packageJsonPath)) {
						packages.push({
							name: entry.name,
							path: packagePath,
							relativePath: `${workspace}/${entry.name}`,
						});
					}
				}
			}
		}
	}

	return packages;
}

/**
 * 主函数
 */
function main() {
	console.log('开始创建 n8n-package...');

	if (fs.existsSync(TARGET_DIR)) {
		// 1. 创建 n8n-package 目录
		console.log('删除现有的 n8n-package 目录...');
		fs.rmSync(TARGET_DIR, { recursive: true, force: true });
	}

	console.log('创建 n8n-package 目录...');
	ensureDir(TARGET_DIR);

	// 2. 复制根目录的必要文件
	console.log('复制根目录文件...');
	for (const fileName of FILES_TO_COPY) {
		const srcPath = path.join(ROOT_DIR, fileName);
		const destPath = path.join(TARGET_DIR, fileName);

		if (fs.existsSync(srcPath)) {
			const stat = fs.statSync(srcPath);
			if (stat.isDirectory()) {
				console.log(`复制目录: ${fileName}`);
				copyDir(srcPath, destPath);
			} else {
				console.log(`复制文件: ${fileName}`);
				copyFile(srcPath, destPath);
			}
		}
	}

	// 3. 扫描并复制所有工作区包
	console.log('扫描工作区包...');
	const packages = getWorkspacePackages();

	console.log(`找到 ${packages.length} 个包:`);
	packages.forEach((pkg) => console.log(`  - ${pkg.relativePath}`));

	// 复制每个包的文件
	for (const pkg of packages) {
		console.log(`\n处理包: ${pkg.name}`);
		const targetPackageDir = path.join(TARGET_DIR, pkg.relativePath);
		ensureDir(targetPackageDir);

		for (const fileName of FILES_TO_COPY) {
			const srcPath = path.join(pkg.path, fileName);
			const destPath = path.join(targetPackageDir, fileName);

			if (fs.existsSync(srcPath)) {
				const stat = fs.statSync(srcPath);
				if (stat.isDirectory()) {
					console.log(`  复制目录: ${fileName}`);
					copyDir(srcPath, destPath);
				} else {
					console.log(`  复制文件: ${fileName}`);
					copyFile(srcPath, destPath);
				}
			}
		}
	}

	// 4. 将 SHELL_SCRIPT_DIR 中的脚本复制到 n8n-package 根目录下
	console.log('复制 shell-script 目录...');
	copyDir(path.join(ROOT_DIR, SHELL_SCRIPT_DIR), path.join(TARGET_DIR));

	console.log('\n✅ 打包完成！');
}

// 运行脚本
main();
