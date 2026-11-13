"""A minimal fallback host for bench/growth-test.sh: it answers every
frame with ok and a small result. Frames are a u32 little-endian length,
then JSON. It speaks protocol version 2 (src/shell/fallback_frames.zig):
it answers the hello with two workers, so wfrt keeps two connections, and
it sends `goaway` on a connection now and then, so wfrt moves to a new one.
Usage: python3 host.py <socket path>"""
import json, os, socket, struct, sys, threading

path = sys.argv[1]
if os.path.exists(path):
    os.unlink(path)
srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
srv.bind(path)
srv.listen(8)
# The test waits for this line: the socket accepts from now on.
print("host ready", flush=True)
GOAWAY_EVERY = 400


def send(conn, obj):
    out = json.dumps(obj, separators=(",", ":")).encode()
    conn.sendall(struct.pack("<I", len(out)) + out)


def serve(conn):
    buf = b""
    steps = 0
    while True:
        data = conn.recv(1 << 16)
        if not data:
            break
        buf += data
        while len(buf) >= 4:
            (n,) = struct.unpack("<I", buf[:4])
            if len(buf) < 4 + n:
                break
            frame = json.loads(buf[4 : 4 + n])
            buf = buf[4 + n :]
            if "hello" in frame:
                send(conn, {"hello": {"version": 2, "workers": 2, "worker": 0}})
                continue
            send(conn, {"id": frame["id"], "ok": True, "result": {"v": 1}})
            steps += 1
            if steps % GOAWAY_EVERY == 0:
                send(conn, {"goaway": {}})
            print("frame", frame.get("kind"), flush=True)
    conn.close()


while True:
    conn, _ = srv.accept()
    threading.Thread(target=serve, args=(conn,), daemon=True).start()
