import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadGlobalConfig } from '../src/config/global-config';
import { globalConfigFile } from '../src/config/paths';
import {
	browserLaunch,
	chooseBrowser,
	DEFAULT_BROWSER,
	installedBrowsers,
} from '../src/integrations/browser';
import {
	chooseEditor,
	editorCommandLine,
	ENV_EDITOR,
	installedEditors,
} from '../src/integrations/editor';

let root: string;
let apps: string;
let bin: string;

function app(name: string, cli?: string) {
	mkdirSync(join(apps, `${name}.app`), { recursive: true });
	if (cli) command(join(apps, `${name}.app`, cli));
}

function command(file: string) {
	mkdirSync(join(file, '..'), { recursive: true });
	writeFileSync(file, '#!/bin/sh\nexit 0\n');
	chmodSync(file, 0o755);
}

function platform(value: NodeJS.Platform) {
	vi.spyOn(process, 'platform', 'get').mockReturnValue(value);
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'rig-integrations-'));
	apps = join(root, 'Applications');
	bin = join(root, 'bin');
	mkdirSync(apps);
	mkdirSync(bin);
	vi.stubEnv('RIG_APPLICATIONS_DIRS', apps);
	// Only the fake commands, plus `sh` for `command -v`. System editors stay out.
	symlinkSync('/bin/sh', join(bin, 'sh'));
	vi.stubEnv('PATH', bin);
	vi.stubEnv('VISUAL', '');
	vi.stubEnv('EDITOR', '');
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	rmSync(root, { recursive: true, force: true });
	rmSync(globalConfigFile(), { force: true });
});

describe('browsers', () => {
	it('should find macOS apps and open them with open -a', () => {
		platform('darwin');
		app('Firefox');
		app('Brave Browser');
		expect(installedBrowsers().map((b) => b.id)).toEqual(['firefox', 'brave']);
		expect(browserLaunch('brave')).toEqual({ command: 'open', args: ['-a', 'Brave Browser'] });
		expect(browserLaunch('Some Other Browser')).toEqual({
			command: 'open',
			args: ['-a', 'Some Other Browser'],
		});
	});

	it('should find Linux commands on PATH', () => {
		platform('linux');
		command(join(bin, 'chromium-browser'));
		expect(installedBrowsers().map((b) => b.id)).toEqual(['chromium']);
		expect(browserLaunch('chromium')).toEqual({ command: 'chromium-browser', args: [] });
		expect(browserLaunch(DEFAULT_BROWSER)).toEqual({ command: 'xdg-open', args: [] });
	});

	it('should use the default browser without a terminal and not save it', async () => {
		platform('darwin');
		app('Firefox');
		app('Safari');
		expect(await chooseBrowser()).toBe(DEFAULT_BROWSER);
		expect(loadGlobalConfig().browser).toBeUndefined();
	});
});

describe('editors', () => {
	it('should find shell commands and the CLI inside a macOS app', () => {
		platform('darwin');
		command(join(bin, 'nvim'));
		app('Cursor', 'Contents/Resources/app/bin/cursor');
		const editors = installedEditors();
		expect(editors.map((e) => e.id)).toEqual(['cursor', 'nvim']);
		expect(editors[0].resolved).toBe(join(apps, 'Cursor.app/Contents/Resources/app/bin/cursor'));
	});

	it('should make GUI editors wait and quote the file', () => {
		platform('linux');
		command(join(bin, 'code'));
		command(join(bin, 'emacs'));
		expect(editorCommandLine('code', "/tmp/it's here.env")).toBe(
			"'code' --wait '/tmp/it'\\''s here.env'",
		);
		expect(editorCommandLine('emacs', '/f')).toBe("'emacs' -nw '/f'");
		expect(editorCommandLine('code-insiders --wait', '/f')).toBe("code-insiders --wait '/f'");
		expect(() => editorCommandLine('zed', '/f')).toThrow('Zed is not installed');
	});

	it('should use $VISUAL or $EDITOR for the env choice', () => {
		vi.stubEnv('EDITOR', 'nano -w');
		expect(editorCommandLine(ENV_EDITOR, '/f')).toBe("nano -w '/f'");
	});

	it('should prefer $EDITOR without a terminal, else the first installed editor', async () => {
		platform('linux');
		command(join(bin, 'vim'));
		expect(await chooseEditor()).toBe('vim');
		vi.stubEnv('EDITOR', 'nano');
		rmSync(globalConfigFile(), { force: true });
		expect(await chooseEditor()).toBe(ENV_EDITOR);
	});
});
