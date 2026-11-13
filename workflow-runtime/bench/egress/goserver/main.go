// An HTTP/2 upstream from Go's net/http (h2 by ALPN on TLS), for interop
// checks of the egress client: /ok, /slow, /echo and /big.
// usage: go run ./bench/egress/goserver <cert.pem> <key.pem> <port>
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync/atomic"
	"time"
)

func main() {
	var conns atomic.Int64
	mux := http.NewServeMux()
	reply := func(w http.ResponseWriter, v any) {
		w.Header().Set("content-type", "application/json")
		_ = json.NewEncoder(w).Encode(v)
	}
	mux.HandleFunc("/ok", func(w http.ResponseWriter, r *http.Request) {
		reply(w, map[string]any{"ok": true, "proto": r.Proto, "conns": conns.Load()})
	})
	mux.HandleFunc("/slow", func(w http.ResponseWriter, r *http.Request) {
		ms, _ := strconv.Atoi(r.URL.Query().Get("ms"))
		time.Sleep(time.Duration(ms) * time.Millisecond)
		reply(w, map[string]any{"ok": true, "proto": r.Proto, "conns": conns.Load()})
	})
	mux.HandleFunc("/echo", func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		reply(w, map[string]any{"length": len(b), "proto": r.Proto})
	})
	mux.HandleFunc("/big", func(w http.ResponseWriter, r *http.Request) {
		kb, _ := strconv.Atoi(r.URL.Query().Get("kb"))
		w.Header().Set("content-type", "application/octet-stream")
		_, _ = io.WriteString(w, strings.Repeat("g", kb*1024))
	})
	// Headers first, then the body after a pause: the response comes in
	// several TLS records and reads (chunked over HTTP/1.1).
	mux.HandleFunc("/split", func(w http.ResponseWriter, r *http.Request) {
		ms, _ := strconv.Atoi(r.URL.Query().Get("ms"))
		w.Header().Set("content-type", "application/json")
		w.WriteHeader(200)
		w.(http.Flusher).Flush()
		time.Sleep(time.Duration(ms) * time.Millisecond)
		_, _ = io.WriteString(w, `{"part":1,`)
		w.(http.Flusher).Flush()
		time.Sleep(time.Duration(ms) * time.Millisecond)
		_, _ = io.WriteString(w, `"done":true}`)
	})
	// Many small writes at once: several TLS records in one TCP segment.
	mux.HandleFunc("/records", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "text/plain")
		w.WriteHeader(200)
		for i := 0; i < 20; i++ {
			_, _ = io.WriteString(w, "r")
			w.(http.Flusher).Flush()
		}
	})
	srv := &http.Server{Addr: "127.0.0.1:" + os.Args[3], Handler: mux}
	srv.ConnState = func(_ net.Conn, s http.ConnState) {
		if s == http.StateNew {
			conns.Add(1)
		}
	}
	fmt.Println("go h2 upstream ready")
	if err := srv.ListenAndServeTLS(os.Args[1], os.Args[2]); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
