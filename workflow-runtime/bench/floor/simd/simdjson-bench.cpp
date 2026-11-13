// The fastest known JSON approach, for floor 3: simdjson (On-Demand and DOM
// parse, and DOM serialization), on the same files as `floor core json`.
// Thread CPU time per operation.
//   clang++ -O3 -std=c++17 -I$(brew --prefix)/include simdjson-bench.cpp \
//     -L$(brew --prefix)/lib -lsimdjson -o simdjson-bench
//   ./simdjson-bench file.json ...
#include <simdjson.h>
#include <time.h>
#include <cstdio>
#include <cstdint>
#include <string>

static uint64_t thread_ns() {
	timespec ts;
	clock_gettime(CLOCK_THREAD_CPUTIME_ID, &ts);
	return uint64_t(ts.tv_sec) * 1000000000ull + uint64_t(ts.tv_nsec);
}

// Walk every value of an On-Demand document, so the parse is complete.
static uint64_t walk(simdjson::ondemand::value v) {
	uint64_t n = 1;
	switch (v.type()) {
	case simdjson::ondemand::json_type::object:
		for (auto field : v.get_object()) {
			std::string_view k = field.unescaped_key();
			n += k.size() + walk(field.value());
		}
		break;
	case simdjson::ondemand::json_type::array:
		for (auto el : v.get_array()) n += walk(el.value());
		break;
	case simdjson::ondemand::json_type::string: n += std::string_view(v.get_string()).size(); break;
	case simdjson::ondemand::json_type::number: n += uint64_t(double(v.get_double())); break;
	case simdjson::ondemand::json_type::boolean: n += bool(v.get_bool()); break;
	default: break;
	}
	return n;
}

int main(int argc, char **argv) {
	for (int f = 1; f < argc; f++) {
		simdjson::padded_string text = simdjson::padded_string::load(argv[f]);
		size_t iters = text.size() > 0 ? (size_t(1) << 30) / text.size() : 1;
		if (iters < 20) iters = 20;
		if (iters > 2000000) iters = 2000000;

		simdjson::ondemand::parser od;
		uint64_t sink = 0;
		uint64_t t = thread_ns();
		for (size_t i = 0; i < iters; i++) {
			auto doc = od.iterate(text);
			sink += walk(doc.get_value());
		}
		double od_ns = double(thread_ns() - t) / iters;

		simdjson::dom::parser dp;
		t = thread_ns();
		for (size_t i = 0; i < iters; i++) {
			simdjson::dom::element el = dp.parse(text);
			sink += el.is_object();
		}
		double dom_ns = double(thread_ns() - t) / iters;

		simdjson::dom::element el = dp.parse(text);
		size_t out = 0;
		t = thread_ns();
		for (size_t i = 0; i < iters; i++) {
			std::string s = simdjson::to_string(el);
			out = s.size();
			sink += s[0];
		}
		double ser_ns = double(thread_ns() - t) / iters;
		double mb = double(text.size()) / 1e6;
		std::printf("simdjson file=%s bytes=%zu ondemand_ns=%.0f dom_ns=%.0f serialize_ns=%.0f ondemand_mb_s=%.0f dom_mb_s=%.0f serialize_mb_s=%.0f sink=%llu\n",
			argv[f], text.size(), od_ns, dom_ns, ser_ns, mb / (od_ns / 1e9), mb / (dom_ns / 1e9), double(out) / 1e6 / (ser_ns / 1e9), (unsigned long long)(sink & 1));
	}
	return 0;
}
