// @ts-check

import path from 'path';
import { $, fs } from 'zx';

const paths = {
	infraCodeDir: path.resolve('infra'),
	terraformStateFile: path.join(path.resolve('infra'), 'terraform.tfstate'),
};

export class TerraformClient {
	constructor({ isVerbose = false }) {
		this.isVerbose = isVerbose;
		this.$$ = $({
			cwd: paths.infraCodeDir,
			verbose: isVerbose,
		});
	}

	/**
	 * Provisions the environment
	 */
	async provisionEnvironment() {
		console.log('Provisioning cloud environment...');

		await this.$$`terraform init`;
		await this.$$`terraform apply -input=false -auto-approve`;
	}

	/**
	 * @typedef {Object} BenchmarkEnv
	 * @property {string} vmName
	 * @property {string} ip
	 * @property {string} sshUsername
	 * @property {string} sshPrivateKeyPath
	 *
	 * @returns {Promise<BenchmarkEnv>}
	 */
	async getTerraformOutputs() {
		const privateKeyName = await this.extractPrivateKey();

		return {
			ip: await this.getTerraformOutput('ip'),
			sshUsername: await this.getTerraformOutput('ssh_username'),
			sshPrivateKeyPath: path.join(paths.infraCodeDir, privateKeyName),
			vmName: await this.getTerraformOutput('vm_name'),
		};
	}

	hasTerraformState() {
		return fs.existsSync(paths.terraformStateFile);
	}

	async destroyEnvironment() {
		console.log('Destroying cloud environment...');

		await this.$$`terraform destroy -input=false -auto-approve`;
	}

	async getTerraformOutput(key) {
		const output = await this.$$`terraform output -raw ${key}`;
		return output.stdout.trim();
	}

	async extractPrivateKey() {
		await this.$$`terraform output -raw ssh_private_key > privatekey.pem`;
		await this.$$`chmod 600 privatekey.pem`;

		return 'privatekey.pem';
	}
}
