import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import pc from 'picocolors';

import { loadGlobalConfig, saveGlobalConfig, setGlobalConfigValue } from '../config/global-config';
import { RigError } from '../errors';
import { RIG } from '../meta';
import { ui } from '../ui/output';
import { isInteractive, select } from '../ui/prompt';
import { applicationDirs, hasMacApp, onPath } from './browser';

/** `editor: env` uses $VISUAL or $EDITOR. */
export const ENV_EDITOR = 'env';

interface EditorInfo {
	id: string;
	label: string;
	command: string;
	/** Flags that make a GUI editor wait until the file closes, so rig can offer a restart. */
	waitArgs: string[];
	/** Runs in the terminal, so it needs the terminal while it runs. */
	terminal: boolean;
	/** The CLI inside the macOS app, for an app without the shell command. */
	macCli?: { app: string; path: string };
}

const gui = (
	id: string,
	label: string,
	command: string,
	macCli?: EditorInfo['macCli'],
): EditorInfo => ({ id, label, command, waitArgs: ['--wait'], terminal: false, macCli });

const tui = (id: string, label: string, command: string, args: string[] = []): EditorInfo => ({
	id,
	label,
	command,
	waitArgs: args,
	terminal: true,
});

export const EDITORS: readonly EditorInfo[] = [
	gui('code', 'Visual Studio Code', 'code', {
		app: 'Visual Studio Code',
		path: 'Contents/Resources/app/bin/code',
	}),
	gui('cursor', 'Cursor', 'cursor', { app: 'Cursor', path: 'Contents/Resources/app/bin/cursor' }),
	gui('windsurf', 'Windsurf', 'windsurf', {
		app: 'Windsurf',
		path: 'Contents/Resources/app/bin/windsurf',
	}),
	gui('zed', 'Zed', 'zed', { app: 'Zed', path: 'Contents/MacOS/cli' }),
	gui('subl', 'Sublime Text', 'subl', {
		app: 'Sublime Text',
		path: 'Contents/SharedSupport/bin/subl',
	}),
	gui('webstorm', 'WebStorm', 'webstorm'),
	gui('idea', 'IntelliJ IDEA', 'idea'),
	tui('nvim', 'Neovim', 'nvim'),
	tui('vim', 'Vim', 'vim'),
	tui('hx', 'Helix', 'hx'),
	tui('micro', 'micro', 'micro'),
	tui('nano', 'nano', 'nano'),
	tui('emacs', 'Emacs', 'emacs', ['-nw']),
];

/** The command of an editor: the shell command, or the CLI inside the macOS app. */
function editorCommand(editor: EditorInfo): string | undefined {
	if (onPath(editor.command)) return editor.command;
	if (process.platform !== 'darwin' || !editor.macCli || !hasMacApp(editor.macCli.app))
		return undefined;
	const { app, path } = editor.macCli;
	return applicationDirs()
		.map((dir) => join(dir, `${app}.app`, path))
		.find((cli) => existsSync(cli));
}

export function installedEditors(): Array<EditorInfo & { resolved: string }> {
	return EDITORS.flatMap((editor) => {
		const resolved = editorCommand(editor);
		return resolved ? [{ ...editor, resolved }] : [];
	});
}

function envEditor(): string | undefined {
	return process.env.VISUAL || process.env.EDITOR || undefined;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

/** The shell command line that opens a file and returns when the file closes. */
export function editorCommandLine(value: string, file: string): string {
	const known = EDITORS.find((editor) => editor.id === value);
	if (known) {
		const command = editorCommand(known);
		if (!command) {
			throw new RigError(
				`${known.label} is not installed.`,
				`Run \`${RIG} config set editor <name>\`, or \`${RIG} config unset editor\` to choose again.`,
			);
		}
		return [shellQuote(command), ...known.waitArgs, shellQuote(file)].join(' ');
	}
	// `env`, or a command line such as `code --wait` or `nvim -p`.
	const line = value === ENV_EDITOR ? (envEditor() ?? 'vi') : value;
	return `${line} ${shellQuote(file)}`;
}

export function editorLabel(value: string): string {
	if (value === ENV_EDITOR) return `$VISUAL or $EDITOR (${envEditor() ?? 'vi'})`;
	return EDITORS.find((editor) => editor.id === value)?.label ?? value;
}

/**
 * The editor for files. The first time, rig asks in a terminal and saves the
 * answer. Without a terminal it uses $VISUAL or $EDITOR, else vi.
 */
export async function chooseEditor(): Promise<string> {
	const configured = loadGlobalConfig().editor;
	if (configured) return configured;
	const installed = installedEditors();
	const fromEnv = envEditor();
	const choices = [
		...(fromEnv ? [{ value: ENV_EDITOR, label: '$VISUAL / $EDITOR', hint: fromEnv }] : []),
		...installed.map((editor) => ({
			value: editor.id,
			label: editor.label,
			hint: editor.terminal ? 'in the terminal' : undefined,
		})),
	];
	if (choices.length === 0) return ENV_EDITOR;
	if (!isInteractive()) return choices[0].value;

	// One choice needs no question.
	const choice =
		choices.length === 1
			? choices[0].value
			: await select<string>('Which editor should rig open files in?', choices, choices[0].value);
	saveGlobalConfig(setGlobalConfigValue(loadGlobalConfig(), 'editor', choice));
	ui.success(
		`Saved: rig opens files in ${editorLabel(choice)}. ${pc.dim(`Change it with \`${RIG} config set editor <name>\`.`)}`,
	);
	return choice;
}

/**
 * Whether an editor command line returns only after the file closes: a known
 * terminal editor, or a known GUI editor with its wait flag.
 */
export function commandLineWaits(line: string): boolean {
	const [command = '', ...args] = line.trim().split(/\s+/);
	const name = basename(command);
	if (name === 'vi') return true;
	const known = EDITORS.find((editor) => editor.command === name);
	if (!known) return false;
	return known.terminal || args.includes('--wait') || args.includes('-w');
}

/**
 * Whether the configured editor surely returns only after the file closes.
 * rig adds the wait flag to a known editor. `$EDITOR` and a command line run
 * as given, so rig checks them.
 */
export async function editorWaits(): Promise<boolean> {
	const editor = await chooseEditor();
	if (EDITORS.some((known) => known.id === editor)) return true;
	return commandLineWaits(editor === ENV_EDITOR ? (envEditor() ?? 'vi') : editor);
}

/** Opens a file in the configured editor and waits until it closes. */
export async function editFile(file: string): Promise<void> {
	const editor = await chooseEditor();
	const line = editorCommandLine(editor, file);
	const result = spawnSync(line, { stdio: 'inherit', shell: true });
	if (result.error || result.status !== 0) {
		throw new RigError(
			`${editorLabel(editor)} exited with ${result.error?.message ?? `code ${result.status}`}.`,
			`Change the editor with \`${RIG} config set editor <name>\`.`,
		);
	}
}
