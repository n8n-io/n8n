// Prints the instructions and cycles that processes have retired so far
// (macOS proc_pid_rusage, RUSAGE_INFO_V4), one line per pid:
//   rusage <pid>...   ->   <pid> <instructions> <cycles>
// Build: cc -O2 -o rusage bench/perf/rusage.c
#include <libproc.h>
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
	for (int i = 1; i < argc; i++) {
		struct rusage_info_v4 ri;
		int pid = atoi(argv[i]);
		if (proc_pid_rusage(pid, RUSAGE_INFO_V4, (rusage_info_t *)&ri) != 0) {
			printf("%d 0 0\n", pid);
			continue;
		}
		printf("%d %llu %llu\n", pid, ri.ri_instructions, ri.ri_cycles);
	}
	return 0;
}
