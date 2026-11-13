# Prints the first port P at or above $1 (default 30000) such that P and P+1
# are both free on 127.0.0.1. Tests use it instead of fixed ports, so two
# runs on one machine (for example CI of two agents) do not collide.
# Usage: PORT=$(bench/lib/free-ports.sh [base])
python3 - "${1:-30000}" <<'PY'
import random, socket, sys
base = int(sys.argv[1])
for p in random.sample(range(base, base + 8000), 8000):
    ok = True
    socks = []
    for q in (p, p + 1):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind(("0.0.0.0", q))
            socks.append(s)
        except OSError:
            ok = False
            s.close()
            break
    for s in socks:
        s.close()
    if ok:
        print(p)
        sys.exit(0)
sys.exit("no two free ports")
PY
