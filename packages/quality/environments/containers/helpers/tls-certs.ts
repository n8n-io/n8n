import { execFileSync } from 'node:child_process';
import { chmodSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface TlsCertFiles {
	caFile: string;
	leaves: Record<string, { certFile: string; keyFile: string }>;
}

const VALIDITY_DAYS = '30';

/**
 * Writes a test certificate authority to `dir`, plus one leaf certificate per
 * entry of `leaves`, signed by that authority. Each leaf can act as a TLS
 * server and as a TLS client, and lists the given subject alternative names,
 * for example `['DNS:localhost', 'IP:127.0.0.1']`.
 *
 * Shells out to `openssl` (present on macOS and GitHub runners). Every file is
 * world-readable, so a container user can read the keys from a bind mount.
 */
export function generateTlsCerts(dir: string, leaves: Record<string, string[]>): TlsCertFiles {
	const caKey = join(dir, 'ca.key');
	const caFile = join(dir, 'ca.crt');
	signCertificate(dir, 'ca', caKey, caFile, [
		'basicConstraints=critical,CA:TRUE',
		'keyUsage=critical,keyCertSign,cRLSign',
	]);

	const files: TlsCertFiles = { caFile, leaves: {} };
	for (const [name, subjectAltNames] of Object.entries(leaves)) {
		const keyFile = join(dir, `${name}.key`);
		const certFile = join(dir, `${name}.crt`);
		signCertificate(
			dir,
			name,
			keyFile,
			certFile,
			[
				'basicConstraints=CA:FALSE',
				'keyUsage=critical,digitalSignature,keyEncipherment',
				'extendedKeyUsage=serverAuth,clientAuth',
				`subjectAltName=${subjectAltNames.join(',')}`,
			],
			{ caFile, caKey },
		);
		files.leaves[name] = { certFile, keyFile };
	}

	for (const file of readdirSync(dir)) chmodSync(join(dir, file), 0o644);

	return files;
}

/** Self-signed without `issuer`. `x509 -extfile` sets exactly these extensions on any openssl version. */
function signCertificate(
	dir: string,
	name: string,
	keyFile: string,
	certFile: string,
	extensions: string[],
	issuer?: { caFile: string; caKey: string },
): void {
	const csrFile = join(dir, `${name}.csr`);
	const extFile = join(dir, `${name}.ext`);
	writeFileSync(extFile, extensions.join('\n'));

	openssl([
		'req',
		'-new',
		'-newkey',
		'rsa:2048',
		'-nodes',
		'-subj',
		`/CN=${name}`,
		'-keyout',
		keyFile,
		'-out',
		csrFile,
	]);
	openssl([
		'x509',
		'-req',
		'-in',
		csrFile,
		'-out',
		certFile,
		'-days',
		VALIDITY_DAYS,
		'-extfile',
		extFile,
		...(issuer
			? ['-CA', issuer.caFile, '-CAkey', issuer.caKey, '-CAcreateserial']
			: ['-signkey', keyFile]),
	]);

	rmSync(csrFile);
	rmSync(extFile);
}

function openssl(args: string[]): void {
	try {
		execFileSync('openssl', args, { stdio: 'pipe' });
	} catch (error) {
		throw new Error(
			`Generating test TLS certificates needs \`openssl\` on PATH: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
