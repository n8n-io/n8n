import {
	closeSync,
	existsSync,
	type FSWatcher,
	mkdirSync,
	openSync,
	readSync,
	renameSync,
	statSync,
	watch,
	writeSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { StringDecoder } from 'node:string_decoder';

/** Moves the current log to `.1.log` and opens a new log file. Returns the file descriptor. */
export function openNewLog(file: string, previous: string, header: string): number {
	mkdirSync(dirname(file), { recursive: true });
	if (existsSync(file)) renameSync(file, previous);
	const fd = openSync(file, 'a');
	writeSync(fd, `${header}\n`);
	return fd;
}

/** Reads the last lines of a file. */
export function tailLines(file: string, count: number): string[] {
	if (!existsSync(file)) return [];
	const size = statSync(file).size;
	const length = Math.min(size, 256 * 1024);
	const buffer = Buffer.alloc(length);
	const fd = openSync(file, 'r');
	try {
		readSync(fd, buffer, 0, length, size - length);
	} finally {
		closeSync(fd);
	}
	const lines = buffer.toString('utf8').split('\n');
	if (lines[lines.length - 1] === '') lines.pop();
	return lines.slice(-count);
}

/** How often the follower checks the file when no file event arrives. */
const FALLBACK_POLL_MS = 1000;

/**
 * Follows a log file by name. A restart replaces the file, so the follower
 * opens the new file and reads it from the start.
 *
 * File events (kqueue on macOS, inotify on Linux) trigger the reads, so new
 * lines show without delay. A slow poll catches what the events miss, for
 * example a file that does not exist yet.
 */
export class LogFollower {
	private fd: number | undefined;
	private inode: number | undefined;
	private offset = 0;
	private decoder = new StringDecoder('utf8');
	private partial = '';
	private readonly buffer = Buffer.alloc(64 * 1024);
	private timer: NodeJS.Timeout | undefined;
	private watcher: FSWatcher | undefined;
	private scheduled = false;
	private stopped = false;

	/** `onLines` gets the complete lines of one read, so the caller can write them at once. */
	constructor(
		private readonly file: string,
		private readonly onLines: (lines: string[]) => void,
		private readonly fromEnd = true,
	) {}

	start(): void {
		this.open(this.fromEnd);
		this.watch();
		// The watch is active from the next event loop turn. Read once then, to catch
		// what was written before it and what the file already holds.
		this.schedule();
		this.timer = setInterval(() => this.poll(), FALLBACK_POLL_MS);
	}

	stop(): void {
		this.stopped = true;
		if (this.timer) clearInterval(this.timer);
		this.unwatch();
		this.poll();
		this.close();
	}

	private watch(): void {
		this.unwatch();
		if (this.stopped || !existsSync(this.file)) return;
		try {
			this.watcher = watch(this.file, { persistent: false }, () => this.schedule());
			this.watcher.on('error', () => this.unwatch());
		} catch {
			// The fallback poll still reads the file.
		}
	}

	private unwatch(): void {
		this.watcher?.close();
		this.watcher = undefined;
	}

	/** Coalesces a burst of file events into one read. */
	private schedule(): void {
		if (this.scheduled || this.stopped) return;
		this.scheduled = true;
		setImmediate(() => {
			this.scheduled = false;
			this.poll();
		});
	}

	private open(fromEnd: boolean): void {
		if (!existsSync(this.file)) return;
		const stat = statSync(this.file);
		this.fd = openSync(this.file, 'r');
		this.inode = stat.ino;
		this.offset = fromEnd ? stat.size : 0;
		this.decoder = new StringDecoder('utf8');
		this.partial = '';
	}

	private close(): void {
		if (this.fd !== undefined) closeSync(this.fd);
		this.fd = undefined;
	}

	private poll(): void {
		if (!existsSync(this.file)) return;
		const stat = statSync(this.file);
		if (this.fd === undefined || stat.ino !== this.inode || stat.size < this.offset) {
			// A restart replaced the file. Read the rest of the old one, then follow the new one.
			this.read();
			this.close();
			this.open(false);
			this.watch();
			// Same as in `start`: the new watch misses writes until the next turn.
			this.schedule();
		}
		this.read();
	}

	private read(): void {
		if (this.fd === undefined) return;
		const lines: string[] = [];
		while (true) {
			const bytes = readSync(this.fd, this.buffer, 0, this.buffer.length, this.offset);
			if (bytes === 0) break;
			this.offset += bytes;
			const parts = (this.partial + this.decoder.write(this.buffer.subarray(0, bytes))).split('\n');
			this.partial = parts.pop() ?? '';
			lines.push(...parts);
		}
		if (lines.length > 0) this.onLines(lines);
	}
}
