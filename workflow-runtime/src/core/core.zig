//! The shard core: one pure function, `step`, that takes the shard state and
//! a batch of input events and produces new state and a batch of actions.
//! It never sees a clock, a socket or a file.
const std = @import("std");
const value = @import("value.zig");
const heap = @import("heap.zig");
const ops = @import("ops.zig");
const json = @import("json.zig");
const simd_json = @import("simd_json.zig");
const exec_index = @import("exec_index.zig");
const interp = @import("interp.zig");
const module = @import("module.zig");
const cron = @import("cron.zig");
const tz = @import("tz.zig");
const multipart = @import("multipart.zig");
const static_data = @import("static_data.zig");
const Arena = @import("arena.zig").Arena;
const reserveMem = @import("arena.zig").reserve;
const Value = value.Value;

// ---- configuration ----------------------------------------------------------

pub const Config = struct {
    shard_id: u16 = 0,
    seed: u64 = 0x5EED,
    max_modules: u32 = 64,
    module_bytes: u32 = 32 << 20,
    natives_total: u32 = 1 << 20,
    slots: u32 = 4096,
    region_sizes: [4]u32 = .{ 4 << 10, 64 << 10, 1 << 20, 16 << 20 },
    region_counts: [4]u32 = .{ 4096, 256, 16, 2 },
    max_parked: u32 = 1 << 20,
    /// Bytes of the snapshots of parked executions, each rounded up to 8.
    /// The shell keeps them in a buffer of this size. A full budget keeps
    /// an execution in memory, as a full parked table does.
    snap_bytes: u64 = 64 << 20,
    max_timers: u32 = 1 << 16,
    max_routes: u32 = 256,
    max_schedules: u32 = 64,
    /// Time zones of schedule triggers and of META `zones`, UTC included.
    /// Time zones of schedules and `Date.zoneOffset`. The IANA database has
    /// about 600 names; a full table is a limit (`zones_full`), not silent.
    max_zones: u32 = 640,
    /// Workflows that can hold static data (spec 9.7), and the largest
    /// document of one workflow. Both are limits with clear errors.
    /// Execution ids of the `none` tier are reserved in blocks of this many:
    /// one logged event (and sync) per block instead of one log record per
    /// execution.
    none_id_block: u64 = 1 << 16,
    max_static_data: u32 = 1024,
    static_data_bytes: u32 = 64 << 10,
    /// Schedule triggers in META start executions. The fixture runner turns
    /// them off: there the fixture gives the trigger value.
    schedules: bool = true,
    max_pending: u32 = 1 << 16,
    max_actions: u32 = 1 << 16,
    max_batch_events: u32 = 1 << 14,
    fuel_per_exec_batch: u64 = 200_000,
    /// Waits at or above this length evict the execution to a snapshot.
    evict_wait_ms: i64 = 1000,
    limits: interp.Limits = .{},
    /// Trace mode, for manual runs and tests: one trace action per effect.
    trace_effects: bool = false,
    /// Tests only: every execution's PRNG starts from this seed.
    exact_seed: ?u64 = null,
    /// Tests only: retry delays do not move time, as in the reference runner.
    immediate_retries: bool = false,
    /// Emit `started`, step `status` and `trace_items` actions for every
    /// execution. The admin event stream (spec 9.2) needs them.
    lifecycle: bool = false,
    /// With `lifecycle`: step events of executions that nobody watches go
    /// out for 1 in this many executions (0: none). See `stepWatched`.
    step_event_sample: u32 = 0,

    pub fn permanentBytes(c: Config) usize {
        var n: usize = c.module_bytes + c.natives_total * 2;
        for (c.region_sizes, c.region_counts) |s, k| n += @as(usize, s) * k + k * 4;
        n += @as(usize, c.slots) * 96;
        n += @as(usize, c.max_timers) * @sizeOf(Timer);
        n += @as(usize, c.max_actions) * @sizeOf(Action);
        n += @as(usize, c.max_routes) * @sizeOf(Route);
        // Hash maps: generous bound for their load factor and metadata.
        n += (@as(usize, c.slots) + c.max_parked + c.max_pending) * 64;
        n += @as(usize, c.max_modules) * @sizeOf(LoadedModule);
        n += @as(usize, c.max_schedules) * @sizeOf(Schedule) + @as(usize, c.max_zones) * @sizeOf(tz.Zone);
        n += @as(usize, c.max_static_data) * (@as(usize, c.static_data_bytes) + static_data.max_id + 8);
        n += (@as(usize, c.slots) + c.max_batch_events) * @sizeOf(StaticCommit);
        return n + (1 << 20);
    }
};

// ---- events and actions -------------------------------------------------------

pub const EventKind = enum(u8) {
    load_module = 1,
    add_route = 2,
    http_request = 3,
    start = 4,
    effect_ok = 5,
    effect_err = 6,
    restore = 7,
    operator = 8,
    cancel = 9,
    subscribe = 10,
    /// Written once after a recovery: resolve effects in doubt. It is an
    /// input, so a later replay makes the same decisions at the same point.
    recover = 11,
    /// A time zone for schedule triggers: the name, a newline, then TZif
    /// bytes. The shell reads the file; the log keeps the bytes, so a replay
    /// does not depend on the files of the machine.
    timezone = 12,
    /// A schedule slot is due. aux: module index. seq: trigger index in the
    /// module. conn: the slot, ms since the epoch. The shell adds these
    /// events from `dueSchedules`, so each fire is an input in the log.
    schedule = 13,
    /// Load or replace a workflow version (spec 9.1). Payload: a JSON
    /// header line, a newline, then the module bytes. `conn` gets the reply.
    load_workflow = 14,
    /// Unload a workflow. Payload: the workflow id. Its routes and
    /// schedules go; running and parked executions finish on their module.
    unload_workflow = 15,
    /// A manual run. exec_id: the id n8n gives (`given_id_flag` set). seq:
    /// `heap.exec_flag_*` bits. Payload: workflow id, a newline, version id
    /// (can be empty), a newline, then the trigger JSON.
    manual = 16,
    /// Replace the workflow variables (spec 9.5). Payload: a JSON object.
    /// Executions that start later see them.
    set_vars = 17,
    /// The shard's resume secret: 32 bytes from the shell's CSPRNG. The
    /// first one wins, so a replay keeps the signatures of spec 9.4.
    secret = 18,
    /// A static data commit (spec 9.7). Payload: the workflow id, a
    /// newline, then the JSON document. The shell logs one for each
    /// `static_data` action; only a replay feeds them back.
    static_data = 19,
    /// A block of execution ids of the `none` tier, up to `conn`. The shell
    /// logs one for each `reserve_none` action; a replay starts the next
    /// block after it, so no id repeats after a restart.
    reserve_none = 20,
};

pub const Event = struct {
    kind: EventKind,
    exec_id: u64 = 0,
    seq: u32 = 0,
    /// start: module index. operator: OperatorAction. schedule: module
    /// generation (`LoadedModule.gen`).
    aux: u32 = 0,
    /// The shell's connection token for replies. Zero means none.
    /// schedule: the slot time instead.
    conn: u64 = 0,
    payload: []const u8 = &.{},
};

pub const OperatorAction = enum(u32) { retry = 0, skip = 1, fail = 2 };

/// A static data change that waits for the end of the batch. `id` and
/// `doc` live in the batch scratch or in the event payload.
const StaticCommit = struct {
    id: []const u8,
    doc: []const u8,
    /// From a logged `static_data` event (a replay), not from an execution.
    logged: bool,
};

/// A start event with this flag only reserves an execution id. It stands
/// in the log for an execution of the `none` tier, which is not replayed.
/// A schedule event with this flag also moves the schedule past its slot.
pub const start_reserve_flag: u32 = 0x8000_0000;

/// `aux` of an `effect_ok` from egress whose JSON body the shell did not
/// check: the payload is the head `{"status":N,"headers":{...}}`, then the
/// raw body. The low bits are the length of the head. The core parses the
/// body once, and makes it a string when it does not parse, as the shell did
/// before (`rawResult`).
pub const raw_body_flag: u32 = 0x8000_0000;

/// Execution ids of the `none` tier have this bit in their counter: they
/// come from their own counter, reserved in blocks (`reserve_none`), so the
/// ids of logged tiers stay the same in a replay.
pub const none_id_flag: u64 = 1 << 47;

/// How the shell writes each input event to the log. The core decides,
/// because only it knows which tier an event belongs to.
pub const LogMode = enum(u8) {
    full = 0,
    /// Log the event without its payload (restore: the snapshot is derived).
    header_only = 1,
    /// Log a start event with `start_reserve_flag` instead.
    reserve = 2,
    skip = 3,
};

pub const ActionKind = enum(u8) {
    reply = 1,
    dispatch = 2,
    finished = 3,
    snapshot = 4,
    drop_snapshot = 5,
    wake = 6,
    attention = 7,
    status = 8,
    /// Fixture runs (`trace_effects`): one per effect, args in the payload.
    trace = 9,
    /// An execution started. aux: `heap.exec_flag_*` bits. Payload: the
    /// trigger JSON.
    started = 10,
    /// A ctx.trace call. Payload: `{"step":name,"items":json}`.
    trace_items = 11,
    /// Static data of a workflow changed (spec 9.7). aux 0: payload is the
    /// workflow id, a newline, the document; the shell logs it as a
    /// `static_data` event and n8n stores it. aux 1: the change was not
    /// kept (a limit); payload is the message.
    static_data = 12,
    /// The core took a new block of `none`-tier ids, up to `conn`. The shell
    /// logs it as a `reserve_none` event and syncs before the batch replies.
    reserve_none = 13,
};

pub const Durability = enum(u8) { none = 0, batched = 1, sync = 2 };

pub const Action = struct {
    kind: ActionKind,
    durability: Durability = .batched,
    effect_kind: module.EffectKind = .node,
    exec_id: u64 = 0,
    seq: u32 = 0,
    step: u32 = 0,
    attempt: u32 = 0,
    /// reply: HTTP status. finished: ExecStatus. status: StepStatus.
    aux: u32 = 0,
    /// reply: the connection token. status `waiting`: the wake time in ms.
    conn: u64 = 0,
    module: u16 = 0,
    idempotent: bool = false,
    key: [32]u8 = undefined,
    payload: []const u8 = &.{},
};

pub const StepStatus = enum(u32) { started = 0, completed = 1, failed = 2, waiting = 3, retrying = 4 };

pub const Output = struct {
    /// Executions still have fuel-limited work: call `step` again soon.
    has_ready: bool,
    /// The earliest timer, in ms, or null.
    next_timer_ms: ?i64,
};

// ---- state ------------------------------------------------------------------------

/// Longest workflow id and version id.
pub const max_id: usize = 64;
/// Longest route path, prefix included.
pub const max_path: usize = 192;
pub const given_id_flag = heap.given_id_flag;
pub const formatExecId = heap.formatExecId;
/// Longest resume URL base and variables document.
pub const max_base: usize = 192;
pub const max_vars: usize = 1 << 20;

pub const ModState = enum(u8) {
    /// The current version of its workflow, or a module from `--module`.
    live,
    /// Replaced or unloaded. It stays while executions use it.
    retired,
    /// Free memory and a free index.
    empty,
};

pub const LoadedModule = struct {
    m: module.Module,
    durability: Durability,
    state: ModState = .live,
    /// Load counter. Schedule events name a module by it, because indices
    /// are reused and reuse depends on when executions finish.
    gen: u32 = 0,
    /// The current version holds one reference, each execution one.
    refs: u32 = 0,
    /// The batch in which `refs` became 0. The memory goes back only in a
    /// later batch, so the actions of that batch can still read the module.
    freed_batch: u64 = 0,
    active: bool = true,
    /// Step events carry args and results (n8n `saveDataSuccessExecution`).
    save_data: bool = false,
    wf_id: [max_id]u8 = undefined,
    wf_id_len: u8 = 0,
    version: [max_id]u8 = undefined,
    version_len: u8 = 0,
    /// ctx.execution(): `resumeUrl` is `<resume_base>/<executionId>`.
    resume_base: [max_base]u8 = undefined,
    resume_len: u8 = 0,
    form_base: [max_base]u8 = undefined,
    form_len: u8 = 0,
    /// The code has VARS: executions capture the variables at start.
    uses_vars: bool = false,
    /// False when the module's meta has `"triggerHeaders":false`: the code
    /// never reads the request headers of a webhook trigger (the compiler
    /// proves it), so the decoded trigger gets `headers: {}`.
    trigger_headers: bool = true,
    /// The smallest region class that held what the last execution of this
    /// module used. New executions start there, not in a class that they
    /// would outgrow at once (a grow compacts and copies the region). It
    /// changes only when regions grow, not what executions compute.
    start_class: u8 = 0,

    pub fn workflowId(lm: *const LoadedModule) []const u8 {
        return lm.wf_id[0..lm.wf_id_len];
    }
    pub fn versionId(lm: *const LoadedModule) []const u8 {
        return lm.version[0..lm.version_len];
    }
};

pub const Route = struct {
    method: [8]u8,
    method_len: u8,
    path: [max_path]u8,
    path_len: u8,
    /// The path has `:name` segments (n8n dynamic webhook).
    dynamic: bool,
    /// Leading segments that must match by position: the prefix and the
    /// webhook id. n8n matches the other static segments as a set.
    fixed: u8,
    nsegs: u8,
    /// Unloaded. The entry is reused; slots keep route indices.
    removed: bool,
    /// Webhook node options from META: `rawBody`, `binaryData`,
    /// `binaryPropertyName`.
    raw_body: bool,
    binary_data: bool,
    bin_prop: [32]u8,
    bin_prop_len: u8,
    module: u16,
    rate_per_s: u32,
    burst: u32,
    concurrency: u32,
    tokens: f64,
    last_ms: i64,
    active: u32,
    rejected: u64,
};

/// The fixed prefix of an add_route payload. The path follows it.
pub const RouteSpec = extern struct {
    module: u32,
    rate_per_s: u32,
    burst: u32,
    concurrency: u32,
    method: [8]u8,
};

/// A schedule trigger of a loaded module.
pub const Schedule = struct {
    module: u16,
    gen: u32,
    index: u16,
    spec: cron.Spec,
    tz_name: [tz.max_name]u8,
    tz_len: u8,
    /// Index in `zones`, or null until the shell sends the zone.
    zone: ?u16,
    /// The next slot to fire, ms since the epoch. Null when there is none.
    next_at: ?i64,
    /// The last slot that started an execution. A slot at or before it
    /// never fires again.
    last_fired: ?i64,
    /// A poll trigger (META `poll: true`, spec 9.8): its runs start quiet.
    poll: bool = false,

    pub fn tzName(sc: *const Schedule) []const u8 {
        return sc.tz_name[0..sc.tz_len];
    }
};

const Timer = struct {
    at_ms: i64,
    exec_id: u64,
    seq: u32,
    kind: enum(u8) { wait, retry },
};

const EffectKey = struct { exec_id: u64, seq: u32 };
const Pending = struct { attempt: u32, step: u32, occurrence: u32, kind: module.EffectKind, in_doubt: bool = false };

const SlotState = enum(u8) { free, ready, parked };

pub const Parked = struct {
    module: u16,
    attention: bool,
    bytes: u32 = 0,
    /// The webhook connection that waits for the reply, and whether the
    /// reply went out. Memory only: a snapshot in the log has no
    /// connection, so an execution recovered from the log never replies.
    conn: u64 = 0,
    responded: bool = true,
};

/// The bytes a snapshot of `len` bytes takes in the shell's store.
pub fn snapFootprint(len: usize) u64 {
    return std.mem.alignForward(u64, len, 8);
}

pub const Counters = struct {
    started: u64 = 0,
    finished_ok: u64 = 0,
    finished_failed: u64 = 0,
    rejected: u64 = 0,
    effects: u64 = 0,
    evictions: u64 = 0,
    restores: u64 = 0,
    promotions: u64 = 0,
    instructions: u64 = 0,
    batches: u64 = 0,
};

const SlotId = u32;

pub const State = struct {
    cfg: Config,
    module_store: []u8,
    module_used: usize = 0,
    natives_store: []u16,
    natives_used: usize = 0,
    modules: []LoadedModule,
    nmodules: u32 = 0,
    routes: []Route,
    nroutes: u32 = 0,
    schedules: []Schedule,
    nschedules: u32 = 0,
    zones: []tz.Zone,
    nzones: u32 = 0,
    /// A zone came while the table was full: lookups of missing zones then
    /// say so, with the flag that raises the limit.
    zones_full: bool = false,
    next_gen: u32 = 1,
    vars_buf: []u8,
    vars_len: u32 = 0,
    secret: [32]u8 = undefined,
    has_secret: bool = false,
    /// Workflow static data, and the changes of this batch. Changes apply
    /// at the end of the batch, in order, so a replay sees them at the same
    /// point.
    statics: static_data.Table,
    static_q: []StaticCommit,
    nstatic_q: u32 = 0,
    /// Set by the shell while it replays a log: executions' static data
    /// changes then come from the logged `static_data` events only, because
    /// executions of the `none` tier are not replayed.
    replaying: bool = false,
    /// The scratch of the running batch, for the late `started` event of a
    /// poll run (`announce`). Set by `step`.
    batch_scratch: ?*Arena = null,

    // Execution slots, as columns.
    slot_state: []SlotState,
    slot_exec: []u64,
    slot_module: []u16,
    slot_route: []u16,
    slot_class: []u8,
    slot_region_idx: []u32,
    slot_conn: []u64,
    slot_responded: []bool,
    slot_subscribed: []bool,
    slot_long_wait: []bool,
    regions: []heap.Region,
    free_slots: []SlotId,
    nfree_slots: u32,
    ready: []SlotId,
    nready: u32 = 0,

    pools: [4][]align(8) u8,
    pool_free: [4][]u32,
    /// Safe builds: which pool entries a slot holds.
    pool_owned: [4][]bool,
    pool_nfree: [4]u32,

    /// Execution id → slot, without tombstones (`exec_index.zig`).
    by_exec: exec_index.ExecIndex(SlotId) = .empty,
    parked: std.AutoHashMapUnmanaged(u64, Parked) = .empty,
    /// The sum of `Parked.bytes`.
    parked_bytes: u64 = 0,
    pending: std.AutoHashMapUnmanaged(EffectKey, Pending) = .empty,
    timers: []Timer,
    ntimers: u32 = 0,

    actions: []Action,
    nactions: u32 = 0,
    log_modes: []LogMode,
    cur_event: u32 = 0,
    next_exec: u64 = 1,
    /// The counter of `none`-tier ids, and the end of the reserved block.
    next_none: u64 = 1,
    none_reserved: u64 = 0,
    /// Removals since the maps were last rehashed. Removals leave tombstones,
    /// and tombstones make every later probe longer.
    map_removals: u32 = 0,
    /// The same for `pending`, which is larger: rehashing it costs in
    /// proportion to its capacity, so it waits for its own share.
    pending_removals: u32 = 0,
    now_ms: i64 = 0,
    counters: Counters = .{},

    pub fn init(gpa: std.mem.Allocator, cfg: Config) !State {
        var s: State = undefined;
        s.cfg = cfg;
        s.module_store = try reserveMem(gpa, u8, cfg.module_bytes);
        s.module_used = 0;
        s.natives_store = try reserveMem(gpa, u16, cfg.natives_total);
        s.natives_used = 0;
        s.modules = try gpa.alloc(LoadedModule, cfg.max_modules);
        s.nmodules = 0;
        s.next_gen = 1;
        s.vars_buf = try reserveMem(gpa, u8, max_vars);
        s.vars_len = 0;
        s.statics = try static_data.Table.init(gpa, cfg.max_static_data, cfg.static_data_bytes);
        s.static_q = try gpa.alloc(StaticCommit, @as(usize, cfg.slots) + cfg.max_batch_events);
        s.nstatic_q = 0;
        s.replaying = false;
        s.has_secret = false;
        s.routes = try gpa.alloc(Route, cfg.max_routes);
        s.nroutes = 0;
        s.schedules = try gpa.alloc(Schedule, cfg.max_schedules);
        s.nschedules = 0;
        std.debug.assert(cfg.max_zones >= 1);
        s.zones = try gpa.alloc(tz.Zone, cfg.max_zones);
        s.zones[0] = tz.utc();
        s.nzones = 1;
        s.slot_state = try gpa.alloc(SlotState, cfg.slots);
        @memset(s.slot_state, .free);
        s.slot_exec = try gpa.alloc(u64, cfg.slots);
        s.slot_module = try gpa.alloc(u16, cfg.slots);
        s.slot_route = try gpa.alloc(u16, cfg.slots);
        s.slot_class = try gpa.alloc(u8, cfg.slots);
        s.slot_region_idx = try gpa.alloc(u32, cfg.slots);
        s.slot_conn = try gpa.alloc(u64, cfg.slots);
        s.slot_responded = try gpa.alloc(bool, cfg.slots);
        s.slot_subscribed = try gpa.alloc(bool, cfg.slots);
        s.slot_long_wait = try gpa.alloc(bool, cfg.slots);
        @memset(s.slot_long_wait, false);
        s.regions = try gpa.alloc(heap.Region, cfg.slots);
        s.free_slots = try gpa.alloc(SlotId, cfg.slots);
        // Pop order is ascending: slot 0 first.
        for (s.free_slots, 0..) |*f, i| f.* = @intCast(cfg.slots - 1 - i);
        s.nfree_slots = cfg.slots;
        s.ready = try gpa.alloc(SlotId, cfg.slots);
        s.nready = 0;
        for (0..4) |c| {
            // Region memory is reserved, not touched: a region's pages become
            // resident when an execution first uses them.
            s.pools[c] = std.mem.sliceAsBytes(try reserveMem(gpa, u64, @as(usize, cfg.region_sizes[c]) / 8 * cfg.region_counts[c]));
            s.pool_free[c] = try gpa.alloc(u32, cfg.region_counts[c]);
            s.pool_owned[c] = try gpa.alloc(bool, if (std.debug.runtime_safety) cfg.region_counts[c] else 0);
            @memset(s.pool_owned[c], false);
            for (s.pool_free[c], 0..) |*f, i| f.* = @intCast(cfg.region_counts[c] - 1 - i);
            s.pool_nfree[c] = cfg.region_counts[c];
        }
        s.by_exec = .empty;
        try s.by_exec.ensureTotalCapacity(gpa, cfg.slots);
        s.parked = .empty;
        s.parked_bytes = 0;
        try s.parked.ensureTotalCapacity(gpa, cfg.max_parked);
        s.pending = .empty;
        try s.pending.ensureTotalCapacity(gpa, cfg.max_pending);
        s.timers = try reserveMem(gpa, Timer, cfg.max_timers);
        s.ntimers = 0;
        s.actions = try reserveMem(gpa, Action, cfg.max_actions);
        // A replayed batch also holds the logged static data changes: at most one per slot.
        s.log_modes = try reserveMem(gpa, LogMode, @as(usize, cfg.max_batch_events) + cfg.slots + 1);
        s.cur_event = 0;
        s.nactions = 0;
        s.next_exec = 1;
        s.next_none = 1;
        s.none_reserved = 0;
        s.map_removals = 0;
        s.pending_removals = 0;
        s.now_ms = 0;
        s.counters = .{};
        return s;
    }

    pub fn moduleAt(s: *const State, i: u16) *const module.Module {
        std.debug.assert(i < s.nmodules);
        std.debug.assert(s.modules[i].state != .empty);
        return &s.modules[i].m;
    }

    /// The current module of a workflow.
    pub fn liveWorkflow(s: *const State, id: []const u8) ?u16 {
        for (s.modules[0..s.nmodules], 0..) |*lm, i| {
            if (lm.state == .live and lm.wf_id_len > 0 and std.mem.eql(u8, lm.workflowId(), id)) return @intCast(i);
        }
        return null;
    }

    /// The members of the result of effect `seq` of execution `exec_id`
    /// that the code can read (the step flags). The shell builds no text
    /// for the others. Unknown effects read everything.
    pub fn resultReads(s: *const State, exec_id: u64, seq: u32) ResultReads {
        const slot = s.by_exec.get(exec_id) orelse return .{};
        const p = s.pending.get(.{ .exec_id = exec_id, .seq = seq }) orelse return .{};
        return stepReads(s, slot, p.step);
    }

    /// True when an execution with this id is loaded or parked.
    pub fn knowsExecution(s: *const State, id: u64) bool {
        return s.by_exec.get(id) != null or s.parked.get(id) != null;
    }

    pub fn liveExecutions(s: *const State) u32 {
        return s.cfg.slots - s.nfree_slots;
    }

    pub fn parkedCount(s: *const State) u32 {
        return s.parked.count();
    }

    pub fn emitted(s: *const State) []const Action {
        return s.actions[0..s.nactions];
    }
};

pub const StepError = error{ ActionsFull, ArenaFull, TooManyEvents };

// ---- the step function ----------------------------------------------------------------

/// Advance the shard by one batch. Actions are in `s.emitted()` until the
/// next call. Payload bytes of actions live in `scratch`, which the caller
/// resets after it has performed the actions.
pub fn step(s: *State, now_ms: i64, events: []const Event, scratch: *Arena) StepError!Output {
    s.nactions = 0;
    s.nstatic_q = 0;
    s.batch_scratch = scratch;
    s.counters.batches += 1;
    // Time never moves backwards inside the core.
    s.now_ms = @max(s.now_ms, now_ms);
    if (events.len > s.log_modes.len) return error.TooManyEvents;
    debugCheckRoots(s, "the start of the batch");
    for (events, 0..) |ev, i| {
        s.cur_event = @intCast(i);
        s.log_modes[i] = .full;
        try applyEvent(s, ev, scratch);
        debugCheckRoots(s, @tagName(ev.kind));
    }
    try fireTimers(s, scratch);
    debugCheckRoots(s, "fireTimers");
    try runReady(s, scratch);
    try applyStaticCommits(s, scratch);
    if (s.map_removals > s.cfg.slots / 4) {
        s.by_exec.rehash(std.hash_map.AutoContext(u64){});
        s.map_removals = 0;
    }
    if (s.pending_removals > s.cfg.max_pending / 4) {
        s.pending.rehash(std.hash_map.AutoContext(EffectKey){});
        s.pending_removals = 0;
    }
    return .{ .has_ready = s.nready > 0, .next_timer_ms = nextWake(s) };
}

/// The earliest timer or schedule slot.
fn nextWake(s: *const State) ?i64 {
    var t: ?i64 = if (s.ntimers > 0) s.timers[0].at_ms else null;
    for (s.schedules[0..s.nschedules]) |sc| {
        const at = sc.next_at orelse continue;
        if (t == null or at < t.?) t = at;
    }
    return t;
}

fn emit(s: *State, a: Action) StepError!void {
    if (s.nactions == s.actions.len) return error.ActionsFull;
    s.actions[s.nactions] = a;
    s.nactions += 1;
}

fn applyEvent(s: *State, ev: Event, scratch: *Arena) StepError!void {
    switch (ev.kind) {
        .load_module => loadModule(s, ev.payload),
        .add_route => addRoute(s, ev.payload),
        .http_request => try httpRequest(s, ev, scratch),
        .start => {
            if (ev.aux & start_reserve_flag != 0) {
                // A given id reserves nothing: the core did not make it.
                if (ev.exec_id == 0) s.next_exec += 1;
                return;
            }
            const mod: u16 = @intCast(ev.aux);
            // The id comes from the reserved `none` block: nothing to log.
            if (mod < s.nmodules and s.modules[mod].durability == .none) s.log_modes[s.cur_event] = .skip;
            _ = try startExecution(s, mod, ev.payload, ev.conn, 0xFFFF, .{ .flags = ev.seq, .id = ev.exec_id }, scratch);
        },
        .effect_ok, .effect_err => try effectResult(s, ev, scratch),
        .restore => {
            s.log_modes[s.cur_event] = .header_only;
            restore(s, ev.exec_id, ev.payload);
            try redispatchInDoubt(s, ev.exec_id, scratch);
        },
        .operator => try operator(s, ev, scratch),
        .cancel => try cancel(s, ev.exec_id, scratch),
        .subscribe => if (s.by_exec.get(ev.exec_id)) |slot| {
            s.slot_subscribed[slot] = true;
        } else {
            // Nothing changes, so a replay does not need it.
            s.log_modes[s.cur_event] = .skip;
        },
        .recover => {
            forgetConnections(s);
            try resolveInDoubt(s, scratch);
        },
        .timezone => addZone(s, ev.payload),
        .schedule => try fireSchedule(s, ev, scratch),
        .load_workflow => try loadWorkflow(s, ev),
        .unload_workflow => try unloadWorkflow(s, ev),
        .manual => try manualRun(s, ev, scratch),
        .set_vars => try setVars(s, ev),
        .static_data => queueLoggedStatic(s, ev),
        .reserve_none => {
            // Only a replay feeds these. Live ids of the block may have gone
            // out, so the next live id starts after the block.
            s.none_reserved = @max(s.none_reserved, ev.conn);
            s.next_none = @max(s.next_none, s.none_reserved + 1);
        },
        .secret => if (s.has_secret or ev.payload.len != 32) {
            s.log_modes[s.cur_event] = .skip;
        } else {
            @memcpy(&s.secret, ev.payload);
            s.has_secret = true;
        },
    }
}

// ---- modules and routes -------------------------------------------------------------

fn loadModule(s: *State, bytes: []const u8) void {
    // Modules are addressed by hash: loading the same bytes twice is a no-op.
    if (bytes.len >= 48) {
        for (s.modules[0..s.nmodules]) |lm| if (lm.state == .live and lm.wf_id_len == 0 and std.mem.eql(u8, &lm.m.hash, bytes[16..48])) return;
    }
    const idx = storeModule(s, bytes) orelse return;
    // A module from `--module` is never unloaded.
    s.modules[idx].refs = 1;
    if (s.cfg.schedules) registerSchedules(s, idx);
}

/// Copy a module into the store and verify it. Returns its index, or null
/// when it is not valid or there is no room.
fn storeModule(s: *State, bytes: []const u8) ?u16 {
    reclaimModules(s);
    const idx: u16 = for (s.modules[0..s.nmodules], 0..) |lm, i| {
        if (lm.state == .empty) break @intCast(i);
    } else blk: {
        if (s.nmodules == s.modules.len) return null;
        break :blk @intCast(s.nmodules);
    };
    if (s.module_used + bytes.len > s.module_store.len or s.natives_used + bytes.len / 4 > s.natives_store.len) compactModules(s);
    if (s.module_used + bytes.len > s.module_store.len) return null;
    const dst = s.module_store[s.module_used..][0..bytes.len];
    @memcpy(dst, bytes);
    const natives = s.natives_store[s.natives_used..];
    const m = module.load(dst, natives) catch return null;
    s.module_used += std.mem.alignForward(usize, bytes.len, 8);
    s.natives_used += m.strCount() + m.aot.len + m.keys.len;
    s.modules[idx] = .{ .m = m, .durability = durabilityOf(m.metaJson()), .gen = s.next_gen };
    s.modules[idx].trigger_headers = std.mem.indexOf(u8, m.metaJson(), "\"triggerHeaders\":false") == null;
    for (m.code) |ins| {
        if (ins.op == @backingInt(module.Op.vars)) s.modules[idx].uses_vars = true;
    }
    s.next_gen += 1;
    if (idx == s.nmodules) s.nmodules += 1;
    return idx;
}

fn modRef(s: *State, mod: u16) void {
    s.modules[mod].refs += 1;
}

fn modUnref(s: *State, mod: u16) void {
    const lm = &s.modules[mod];
    std.debug.assert(lm.refs > 0);
    lm.refs -= 1;
    if (lm.refs == 0) lm.freed_batch = s.counters.batches;
}

/// Retired modules with no execution, freed in an earlier batch, become
/// empty. The bytes go back at the next compaction.
fn reclaimModules(s: *State) void {
    for (s.modules[0..s.nmodules]) |*lm| {
        if (lm.state == .retired and lm.refs == 0 and lm.freed_batch < s.counters.batches) lm.state = .empty;
    }
}

/// Move the modules that are not empty to the start of the store, in byte
/// order, and verify each again at its new place. Nothing outside the core
/// holds a pointer into the store between batches.
fn compactModules(s: *State) void {
    var order: [1024]u16 = undefined;
    std.debug.assert(s.nmodules <= order.len);
    var n: usize = 0;
    for (s.modules[0..s.nmodules], 0..) |lm, i| {
        if (lm.state == .empty) continue;
        // Insertion sort by offset: there are few modules.
        var j = n;
        while (j > 0 and @intFromPtr(s.modules[order[j - 1]].m.bytes.ptr) > @intFromPtr(lm.m.bytes.ptr)) : (j -= 1) order[j] = order[j - 1];
        order[j] = @intCast(i);
        n += 1;
    }
    var off: usize = 0;
    var nat: usize = 0;
    for (order[0..n]) |i| {
        const lm = &s.modules[i];
        const len = lm.m.bytes.len;
        const start = @intFromPtr(lm.m.bytes.ptr) - @intFromPtr(s.module_store.ptr);
        std.debug.assert(start >= off);
        if (start != off) std.mem.copyForwards(u8, s.module_store[off..][0..len], s.module_store[start..][0..len]);
        // The bytes verified before, so they verify again.
        lm.m = module.load(s.module_store[off..][0..len], s.natives_store[nat..]) catch unreachable;
        off += std.mem.alignForward(usize, len, 8);
        nat += lm.m.strCount() + lm.m.aot.len + lm.m.keys.len;
    }
    s.module_used = off;
    s.natives_used = nat;
}

fn durabilityOf(meta: []const u8) Durability {
    if (std.mem.indexOf(u8, meta, "\"durability\":\"sync\"") != null) return .sync;
    if (std.mem.indexOf(u8, meta, "\"durability\":\"none\"") != null) return .none;
    return .batched;
}

fn addRoute(s: *State, payload: []const u8) void {
    if (payload.len < @sizeOf(RouteSpec)) return;
    const spec = std.mem.bytesToValue(RouteSpec, payload[0..@sizeOf(RouteSpec)]);
    const path = payload[@sizeOf(RouteSpec)..];
    if (path.len > max_path or spec.module >= s.nmodules) return;
    const method_len = std.mem.indexOfScalar(u8, &spec.method, 0) orelse 8;
    var r = makeRoute(spec.method[0..method_len], path, @intCast(spec.module), leadingLiterals(path)) orelse return;
    r.rate_per_s = spec.rate_per_s;
    r.burst = @max(1, spec.burst);
    r.concurrency = spec.concurrency;
    r.tokens = @floatFromInt(r.burst);
    r.last_ms = s.now_ms;
    putRoute(s, r);
}

fn makeRoute(method: []const u8, path: []const u8, mod: u16, fixed: u8) ?Route {
    if (method.len == 0 or method.len > 8 or path.len > max_path) return null;
    var r: Route = std.mem.zeroes(Route);
    @memcpy(r.method[0..method.len], method);
    r.method_len = @intCast(method.len);
    @memcpy(r.path[0..path.len], path);
    r.path_len = @intCast(path.len);
    r.module = mod;
    r.dynamic = isDynamicPath(path);
    r.nsegs = @intCast(@min(255, segmentCount(path)));
    r.fixed = fixed;
    r.burst = 1;
    r.tokens = 1;
    return r;
}

fn putRoute(s: *State, r: Route) void {
    for (s.routes[0..s.nroutes]) |*slot| if (slot.removed) {
        slot.* = r;
        return;
    };
    if (s.nroutes == s.routes.len) return;
    s.routes[s.nroutes] = r;
    s.nroutes += 1;
}

/// n8n: a path is dynamic when a segment starts with `:`.
pub fn isDynamicPath(path: []const u8) bool {
    return std.mem.startsWith(u8, path, ":") or std.mem.indexOf(u8, path, "/:") != null;
}

fn segmentCount(path: []const u8) usize {
    var it = std.mem.tokenizeScalar(u8, path, '/');
    var n: usize = 0;
    while (it.next()) |_| n += 1;
    return n;
}

fn leadingLiterals(path: []const u8) u8 {
    var it = std.mem.tokenizeScalar(u8, path, '/');
    var n: u8 = 0;
    while (it.next()) |seg| {
        if (seg[0] == ':' or n == 255) break;
        n += 1;
    }
    return n;
}

// ---- workflows (spec 9.1) ----------------------------------------------------

const WorkflowHeader = struct {
    id: []const u8,
    version: []const u8,
    active: bool,
    save_data: bool,
    prefix: []const u8,
    resume_base: []const u8,
    form_base: []const u8,
    /// `staticData`: the workflow's static data from n8n (spec 9.7), as raw
    /// JSON, or null to keep what the shard has.
    static_doc: ?[]const u8 = null,
};

fn parseHeader(line: []const u8) ?WorkflowHeader {
    const id = module.jsonStr(module.jsonGet(line, "workflowId")) orelse return null;
    const version = module.jsonStr(module.jsonGet(line, "versionId")) orelse "";
    const prefix = module.jsonStr(module.jsonGet(line, "webhookPrefix")) orelse "/webhook";
    if (id.len == 0 or id.len > max_id or version.len > max_id or prefix.len > 64) return null;
    if (std.mem.indexOfScalar(u8, id, '\n') != null) return null;
    const active = if (module.jsonGet(line, "active")) |v| std.mem.eql(u8, v, "true") else false;
    const save_data = if (module.jsonGet(line, "saveData")) |v| std.mem.eql(u8, v, "true") else false;
    const resume_base = module.jsonStr(module.jsonGet(line, "resumeUrlBase")) orelse "/resume";
    const form_base = module.jsonStr(module.jsonGet(line, "resumeFormUrlBase")) orelse resume_base;
    if (resume_base.len > max_base or form_base.len > max_base) return null;
    const static_doc = module.jsonGet(line, "staticData");
    if (static_doc) |d| if (d.len == 0 or (d[0] != '{' and !std.mem.eql(u8, d, "null"))) return null;
    return .{ .id = id, .version = version, .active = active, .save_data = save_data, .prefix = prefix, .resume_base = resume_base, .form_base = form_base, .static_doc = static_doc };
}

/// The route of a META webhook trigger, as n8n builds it: the prefix, then
/// `<webhookId>/<path>` for a dynamic path with a webhook id, else the path.
/// Leading and trailing slashes of the path are dropped.
fn webhookRoute(prefix_raw: []const u8, trigger: []const u8, mod: u16) ?Route {
    const kind = module.jsonStr(module.jsonGet(trigger, "kind")) orelse return null;
    if (!std.mem.eql(u8, kind, "webhook")) return null;
    const raw = module.jsonStr(module.jsonGet(trigger, "path")) orelse return null;
    const method = module.jsonStr(module.jsonGet(trigger, "method")) orelse "POST";
    const path = std.mem.trim(u8, std.mem.trim(u8, raw, " "), "/");
    const prefix = std.mem.trim(u8, prefix_raw, "/");
    var buf: [max_path + 2]u8 = undefined;
    var n: usize = 0;
    var fixed: u8 = 0;
    const parts = [_][]const u8{ prefix, if (isDynamicPath(path)) module.jsonStr(module.jsonGet(trigger, "webhookId")) orelse "" else "", path };
    for (parts, 0..) |part, pi| {
        if (part.len == 0) continue;
        if (n + 1 + part.len > buf.len) return null;
        buf[n] = '/';
        @memcpy(buf[n + 1 ..][0..part.len], part);
        n += 1 + part.len;
        if (pi < 2) fixed += @intCast(@min(64, segmentCount(part)));
    }
    if (n == 0) return null;
    var r = makeRoute(method, buf[0..n], mod, fixed) orelse return null;
    r.raw_body = if (module.jsonGet(trigger, "rawBody")) |v| std.mem.eql(u8, v, "true") else false;
    r.binary_data = if (module.jsonGet(trigger, "binaryData")) |v| std.mem.eql(u8, v, "true") else false;
    if (module.jsonStr(module.jsonGet(trigger, "binaryPropertyName"))) |bp| if (bp.len <= r.bin_prop.len) {
        @memcpy(r.bin_prop[0..bp.len], bp);
        r.bin_prop_len = @intCast(bp.len);
    };
    return r;
}

/// A route of another module with the same method and path. n8n refuses to
/// activate a workflow whose webhook another active workflow has.
fn routeConflict(s: *const State, r: *const Route, except: ?u16) bool {
    for (s.routes[0..s.nroutes]) |*o| {
        if (o.removed or (except != null and o.module == except.?)) continue;
        if (std.mem.eql(u8, o.method[0..o.method_len], r.method[0..r.method_len]) and std.mem.eql(u8, o.path[0..o.path_len], r.path[0..r.path_len])) return true;
    }
    return false;
}

/// Check the webhook routes of META before anything changes. Returns the
/// reply body of the first problem, or null.
fn checkRoutes(s: *const State, meta: []const u8, prefix: []const u8, except: ?u16) ?[]const u8 {
    var free: u32 = s.cfg.max_routes - s.nroutes;
    for (s.routes[0..s.nroutes]) |r| {
        if (r.removed or (except != null and r.module == except.?)) free += 1;
    }
    var it = module.triggers(meta);
    while (it.next()) |t| {
        const kind = module.jsonStr(module.jsonGet(t, "kind")) orelse continue;
        if (!std.mem.eql(u8, kind, "webhook")) continue;
        const r = webhookRoute(prefix, t, 0) orelse return "{\"error\":\"a webhook path is not valid\"}";
        if (routeConflict(s, &r, except)) return "{\"error\":\"another active workflow has this webhook path\"}";
        if (free == 0) return "{\"error\":\"too many routes\"}";
        free -= 1;
    }
    return null;
}

fn registerRoutes(s: *State, mod: u16, prefix: []const u8) void {
    var it = module.triggers(s.modules[mod].m.metaJson());
    while (it.next()) |t| {
        const r = webhookRoute(prefix, t, mod) orelse continue;
        putRoute(s, r);
    }
}

/// Stop the triggers of a module: its routes and schedules.
fn removeTriggers(s: *State, mod: u16) void {
    for (s.routes[0..s.nroutes]) |*r| {
        if (!r.removed and r.module == mod) r.removed = true;
    }
    var w: u32 = 0;
    for (s.schedules[0..s.nschedules]) |sc| {
        if (sc.module == mod) continue;
        s.schedules[w] = sc;
        w += 1;
    }
    s.nschedules = w;
}

fn setIdentity(lm: *LoadedModule, h: WorkflowHeader) void {
    @memcpy(lm.wf_id[0..h.id.len], h.id);
    lm.wf_id_len = @intCast(h.id.len);
    @memcpy(lm.version[0..h.version.len], h.version);
    lm.version_len = @intCast(h.version.len);
    lm.active = h.active;
    lm.save_data = h.save_data;
    @memcpy(lm.resume_base[0..h.resume_base.len], h.resume_base);
    lm.resume_len = @intCast(h.resume_base.len);
    @memcpy(lm.form_base[0..h.form_base.len], h.form_base);
    lm.form_len = @intCast(h.form_base.len);
}

fn setVars(s: *State, ev: Event) StepError!void {
    const t = std.mem.trim(u8, ev.payload, " \t\r\n");
    if (t.len == 0 or t[0] != '{' or t.len > s.vars_buf.len) return rejectEvent(s, ev.conn, 400, "{\"error\":\"variables must be a JSON object\"}");
    @memcpy(s.vars_buf[0..t.len], t);
    s.vars_len = @intCast(t.len);
    try reply(s, ev.conn, 200, "{\"ok\":true}");
}

fn startTriggers(s: *State, mod: u16, prefix: []const u8) void {
    if (!s.modules[mod].active) return;
    registerRoutes(s, mod, prefix);
    if (s.cfg.schedules) registerSchedules(s, mod);
}

fn loadWorkflow(s: *State, ev: Event) StepError!void {
    const nl = std.mem.indexOfScalar(u8, ev.payload, '\n') orelse return rejectEvent(s, ev.conn, 400, "{\"error\":\"bad load event\"}");
    const h = parseHeader(ev.payload[0..nl]) orelse return rejectEvent(s, ev.conn, 400, "{\"error\":\"bad workflow header\"}");
    const bytes = ev.payload[nl + 1 ..];
    const meta = module.metaOf(bytes) orelse return rejectEvent(s, ev.conn, 400, "{\"error\":\"the module is not valid\"}");
    const old = s.liveWorkflow(h.id);
    if (h.active) if (checkRoutes(s, meta, h.prefix, old)) |err| return rejectEvent(s, ev.conn, 409, err);
    if (h.static_doc) |d| if (d.len > s.statics.cap) return rejectEvent(s, ev.conn, 413, "{\"error\":\"the workflow static data is larger than the limit (raise --static-data-kb)\"}");
    if (h.static_doc) |d| if (!staticEmpty(d) and s.statics.find(h.id) == null and s.statics.count == s.statics.entries()) {
        return rejectEvent(s, ev.conn, 507, "{\"error\":\"the static data table is full (raise --max-static-data)\"}");
    };
    if (old) |o| if (bytes.len >= 48 and std.mem.eql(u8, &s.modules[o].m.hash, bytes[16..48])) {
        // The same module: only the version and trigger settings change.
        removeTriggers(s, o);
        setIdentity(&s.modules[o], h);
        seedStatic(s, h);
        startTriggers(s, o, h.prefix);
        return reply(s, ev.conn, 200, "{\"ok\":true}");
    };
    const idx = storeModule(s, bytes) orelse return rejectStore(s, ev.conn, bytes.len);
    setIdentity(&s.modules[idx], h);
    s.modules[idx].refs = 1;
    if (old) |o| retire(s, o);
    seedStatic(s, h);
    startTriggers(s, idx, h.prefix);
    try reply(s, ev.conn, 200, "{\"ok\":true}");
}

/// Why `storeModule` failed. A retired version stays loaded while an
/// execution uses it: also one that waits or needs attention. Ending those
/// executions (`DELETE /_admin/executions/<id>`) frees it.
fn rejectStore(s: *State, conn: u64, len: usize) StepError!void {
    std.debug.assert(s.nmodules <= s.modules.len);
    const table_full = s.nmodules == s.modules.len and for (s.modules[0..s.nmodules]) |lm| {
        if (lm.state == .empty) break false;
    } else true;
    if (table_full) return rejectEvent(s, conn, 507, "{\"error\":\"the module table is full (--max-modules); old versions stay loaded while executions use them, also executions that wait or need attention\"}");
    if (s.module_used + len > s.module_store.len or s.natives_used + len / 4 > s.natives_store.len) return rejectEvent(s, conn, 507, "{\"error\":\"the module store is full (--module-store-mb); old versions stay loaded while executions use them, also executions that wait or need attention\"}");
    return rejectEvent(s, conn, 400, "{\"error\":\"the module is not valid\"}");
}

// ---- workflow static data (spec 9.7) ------------------------------------------------

fn staticEmpty(doc: []const u8) bool {
    return std.mem.eql(u8, doc, "null") or static_data.isEmpty(doc);
}

/// The static data that n8n sends with a workflow replaces the shard's.
/// `loadWorkflow` checked the limits first.
fn seedStatic(s: *State, h: WorkflowHeader) void {
    const doc = h.static_doc orelse return;
    if (staticEmpty(doc)) return s.statics.remove(h.id);
    s.statics.set(h.id, doc) catch unreachable;
}

fn queueStatic(s: *State, c: StaticCommit) void {
    // The queue has room for one change per slot and one per event.
    std.debug.assert(s.nstatic_q < s.static_q.len);
    s.static_q[s.nstatic_q] = c;
    s.nstatic_q += 1;
}

/// A logged change, from a replay. It applies at the end of the batch, as
/// the change of the execution did.
fn queueLoggedStatic(s: *State, ev: Event) void {
    const nl = std.mem.indexOfScalar(u8, ev.payload, '\n') orelse return;
    const id = ev.payload[0..nl];
    if (id.len == 0 or id.len > max_id) return;
    queueStatic(s, .{ .id = id, .doc = ev.payload[nl + 1 ..], .logged = true });
}

/// At the end of the batch: apply the changes in order; the last writer
/// wins. Live, each kept change goes out as an action, which the shell logs
/// and n8n stores. In a replay the logged changes are the ones to apply.
fn applyStaticCommits(s: *State, scratch: *Arena) StepError!void {
    for (s.static_q[0..s.nstatic_q]) |c| {
        if (c.logged != s.replaying) continue;
        s.statics.set(c.id, c.doc) catch |e| {
            const why = switch (e) {
                error.TableFull => "the static data table is full (raise --max-static-data)",
                error.TooLarge => "the static data is larger than the limit (raise --static-data-kb)",
            };
            try emit(s, .{ .kind = .static_data, .aux = 1, .payload = try joinScratch(scratch, &.{ "The static data of workflow ", c.id, " was not saved: ", why }) });
            continue;
        };
        try emit(s, .{ .kind = .static_data, .payload = try joinScratch(scratch, &.{ c.id, "\n", c.doc }) });
    }
    s.nstatic_q = 0;
}

/// When an execution ends: queue its static data when a step changed it.
/// Manual runs do not keep static data, as in n8n.
fn commitStatic(s: *State, slot: SlotId, vm: *ops.Vm, scratch: *Arena) StepError!void {
    const e = s.regions[slot].exec();
    if (e.static_doc == value.undef or e.flags & heap.exec_flag_manual != 0) return;
    const lm = &s.modules[s.slot_module[slot]];
    if (lm.wf_id_len == 0) return;
    const doc = try encodeJson(vm, e.static_doc, scratch);
    const start: []const u8 = if (value.kindOf(e.static_start) == .string) vm.str(e.static_start) else "{}";
    if (std.mem.eql(u8, doc, start)) return;
    queueStatic(s, .{ .id = try scratchDupe(scratch, lm.workflowId()), .doc = doc, .logged = false });
}

fn retire(s: *State, mod: u16) void {
    removeTriggers(s, mod);
    s.modules[mod].state = .retired;
    modUnref(s, mod);
}

fn unloadWorkflow(s: *State, ev: Event) StepError!void {
    const mod = s.liveWorkflow(ev.payload) orelse return rejectEvent(s, ev.conn, 404, "{\"error\":\"unknown workflow\"}");
    retire(s, mod);
    // n8n keeps its copy; a later load sends it again.
    s.statics.remove(ev.payload);
    try reply(s, ev.conn, 200, "{\"ok\":true}");
}

/// Reply with an error. The event changed nothing, so it is not logged.
fn rejectEvent(s: *State, conn: u64, status: u32, body: []const u8) StepError!void {
    s.log_modes[s.cur_event] = .skip;
    try reply(s, conn, status, body);
}

fn manualRun(s: *State, ev: Event, scratch: *Arena) StepError!void {
    var it = std.mem.splitScalar(u8, ev.payload, '\n');
    const id = it.next() orelse "";
    const version = it.next() orelse "";
    const trigger = it.rest();
    const mod = s.liveWorkflow(id) orelse return rejectEvent(s, ev.conn, 404, "{\"error\":\"unknown workflow\"}");
    if (version.len > 0 and !std.mem.eql(u8, version, s.modules[mod].versionId())) return rejectEvent(s, ev.conn, 409, "{\"error\":\"this version is not loaded\"}");
    if (ev.exec_id & given_id_flag == 0) return rejectEvent(s, ev.conn, 400, "{\"error\":\"bad execution id\"}");
    if (s.knowsExecution(ev.exec_id)) return rejectEvent(s, ev.conn, 409, "{\"error\":\"the execution id is in use\"}");
    // The none tier keeps no record; a given id needs no reservation.
    if (s.modules[mod].durability == .none) s.log_modes[s.cur_event] = .skip;
    const started = try startExecution(s, mod, if (trigger.len == 0) "null" else trigger, ev.conn, 0xFFFF, .{ .flags = ev.seq | heap.exec_flag_manual, .id = ev.exec_id, .quiet = true }, scratch);
    if (!started) {
        s.log_modes[s.cur_event] = .skip;
        return;
    }
    var buf: [64]u8 = undefined;
    var idb: [32]u8 = undefined;
    const body = std.fmt.bufPrint(&buf, "{{\"executionId\":\"{s}\"}}", .{formatExecId(ev.exec_id, &idb)}) catch unreachable;
    try reply(s, ev.conn, 202, try scratchDupe(scratch, body));
}

fn scratchDupe(scratch: *Arena, b: []const u8) StepError![]const u8 {
    return scratch.dupe(b) catch error.ArenaFull;
}

pub fn parseExecId(text: []const u8) ?u64 {
    if (std.mem.startsWith(u8, text, "wfrt-")) {
        const n = std.fmt.parseInt(u64, text[5..], 10) catch return null;
        return if (n == 0 or n & given_id_flag != 0) null else n;
    }
    if (text.len == 0 or text[0] == '+' or text[0] == '-') return null;
    const n = std.fmt.parseInt(u64, text, 10) catch return null;
    if (n >= given_id_flag) return null;
    return n | given_id_flag;
}

// ---- schedule triggers ----------------------------------------------------------

/// Read a module's schedule triggers from META. The compiler rejects a spec
/// that the core cannot read, so such a trigger is only left out here.
fn registerSchedules(s: *State, mod: u16) void {
    var it = module.triggers(s.modules[mod].m.metaJson());
    var index: u16 = 0;
    while (it.next()) |t| : (index += 1) {
        if (s.nschedules == s.schedules.len) return;
        const kind = module.jsonStr(module.jsonGet(t, "kind")) orelse continue;
        if (!std.mem.eql(u8, kind, "schedule")) continue;
        const spec = specOf(t) orelse continue;
        const name = module.jsonStr(module.jsonGet(t, "timezone")) orelse "UTC";
        if (name.len > tz.max_name) continue;
        const poll = if (module.jsonGet(t, "poll")) |v| std.mem.eql(u8, v, "true") else false;
        var sc: Schedule = .{ .module = mod, .gen = s.modules[mod].gen, .index = index, .spec = spec, .tz_name = undefined, .tz_len = @intCast(name.len), .zone = findZone(s, name), .next_at = null, .last_fired = null, .poll = poll };
        @memcpy(sc.tz_name[0..name.len], name);
        if (sc.zone) |z| sc.next_at = cron.nextSlot(&sc.spec, s.now_ms, &s.zones[z]);
        s.schedules[s.nschedules] = sc;
        s.nschedules += 1;
    }
}

/// The spec of a META schedule trigger: `cron`, or `every` (spec 1.4).
pub fn specOf(trigger: []const u8) ?cron.Spec {
    if (module.jsonStr(module.jsonGet(trigger, "cron"))) |c| return cron.parse(c) catch null;
    const every = module.jsonGet(trigger, "every") orelse return null;
    const unit = std.meta.stringToEnum(cron.Unit, module.jsonStr(module.jsonGet(every, "unit")) orelse return null) orelse return null;
    const v = module.jsonInt(module.jsonGet(every, "value")) orelse return null;
    if (v < 1 or v > 1_000_000) return null;
    var e: cron.Every = .{ .unit = unit, .value = @intCast(v) };
    if (module.jsonGet(every, "atHour")) |raw| {
        const h = module.jsonInt(raw) orelse return null;
        if (h < 0 or h > 23) return null;
        e.at_hour = @intCast(h);
    }
    if (module.jsonGet(every, "atMinute")) |raw| {
        const m = module.jsonInt(raw) orelse return null;
        if (m < 0 or m > 59) return null;
        e.at_minute = @intCast(m);
    }
    if (module.jsonGet(every, "onWeekdays")) |raw| {
        e.weekdays_given = true;
        var days = module.ArrayIter.init(raw);
        var guard: u32 = 0;
        while (days.next()) |d| : (guard += 1) {
            if (guard == 7) return null;
            const wd = module.jsonInt(d) orelse return null;
            if (wd < 0 or wd > 6) return null;
            e.weekdays |= @as(u8, 1) << @intCast(wd);
        }
    }
    if (module.jsonGet(every, "onDayOfMonth")) |raw| {
        const d = module.jsonInt(raw) orelse return null;
        if (d < 1 or d > 31) return null;
        e.day_of_month = @intCast(d);
    }
    return cron.fromEvery(e) catch null;
}

/// True when the zone `name` is loaded (the shell skips reading its file).
pub fn hasZone(s: *const State, name: []const u8) bool {
    return findZone(s, name) != null;
}

/// True when the zone table has no room for another zone.
pub fn zonesAreFull(s: *const State) bool {
    return s.nzones == s.zones.len;
}

fn findZone(s: *const State, name: []const u8) ?u16 {
    for (s.zones[0..s.nzones], 0..) |*z, i| {
        if (std.mem.eql(u8, z.name(), name)) return @intCast(i);
    }
    return null;
}

/// timezone payload: the name, a newline, then TZif bytes.
fn addZone(s: *State, payload: []const u8) void {
    const nl = std.mem.indexOfScalar(u8, payload, '\n') orelse return;
    const name = payload[0..nl];
    if (name.len == 0 or name.len > tz.max_name) return;
    // The first copy wins, so a replay does not depend on later files.
    if (findZone(s, name) != null) {
        s.log_modes[s.cur_event] = .skip;
        return;
    }
    if (s.nzones == s.zones.len) {
        // Logged: a replay must see the same full table.
        s.zones_full = true;
        return;
    }
    const z = &s.zones[s.nzones];
    z.* = .{};
    tz.setName(z, name);
    tz.parseTzif(payload[nl + 1 ..], z) catch return;
    s.nzones += 1;
    // Schedules loaded before their zone start now.
    for (s.schedules[0..s.nschedules]) |*sc| {
        if (sc.zone != null or !std.mem.eql(u8, sc.tzName(), name)) continue;
        sc.zone = @intCast(s.nzones - 1);
        sc.next_at = cron.nextSlot(&sc.spec, s.now_ms, z);
    }
}

/// The schedule events that are due at `now_ms`. It reads the state and
/// changes nothing. The shell adds the events to the batch, so every fire
/// is an input in the log and a replay makes the same fires. After
/// downtime a schedule fires once, for its latest missed slot.
pub fn dueSchedules(s: *const State, now_ms: i64, out: []Event) usize {
    const now = @max(s.now_ms, now_ms);
    var n: usize = 0;
    for (s.schedules[0..s.nschedules]) |*sc| {
        if (n == out.len) break;
        const at = sc.next_at orelse continue;
        if (at > now) continue;
        const slot = cron.latestSlot(&sc.spec, at, now, &s.zones[sc.zone.?]);
        out[n] = .{ .kind = .schedule, .aux = sc.gen, .seq = sc.index, .conn = @bitCast(slot) };
        n += 1;
    }
    return n;
}

fn findSchedule(s: *State, gen: u32, index: u32) ?*Schedule {
    for (s.schedules[0..s.nschedules]) |*sc| {
        if (sc.gen == gen and sc.index == index) return sc;
    }
    return null;
}

fn fireSchedule(s: *State, ev: Event, scratch: *Arena) StepError!void {
    const reserve = ev.aux & start_reserve_flag != 0;
    const gen = ev.aux & ~start_reserve_flag;
    const slot: i64 = @bitCast(ev.conn);
    const sc = findSchedule(s, gen, ev.seq) orelse {
        s.log_modes[s.cur_event] = .skip;
        return;
    };
    // A slot fires once. A repeated or older event changes nothing.
    if (sc.last_fired) |last| if (slot <= last) {
        s.log_modes[s.cur_event] = .skip;
        return;
    };
    // With no free slot the event is not logged; the shell offers it again.
    if (!reserve and s.nfree_slots == 0) {
        s.log_modes[s.cur_event] = .skip;
        return;
    }
    sc.last_fired = slot;
    // Catch-up "once": the next slot comes after now, not after the slot.
    if (sc.zone) |z| sc.next_at = cron.nextSlot(&sc.spec, @max(slot, s.now_ms), &s.zones[z]);
    // A reserved fire of the `none` tier only moves the schedule: its id
    // came from the reserved block.
    if (reserve) return;
    const mod = sc.module;
    if (s.modules[mod].durability == .none) s.log_modes[s.cur_event] = .reserve;
    var buf: [48]u8 = undefined;
    const trigger = std.fmt.bufPrint(&buf, "{{\"scheduledAt\":{d}}}", .{slot}) catch unreachable;
    _ = try startExecution(s, mod, trigger, 0, 0xFFFF, .{ .flags = if (sc.poll) heap.exec_flag_quiet else 0 }, scratch);
}

/// http_request payload: "METHOD TARGET\n", the request headers as one
/// line of JSON with lower-case names, "\n", then the body.
fn httpRequest(s: *State, ev: Event, scratch: *Arena) StepError!void {
    const req = splitRequest(ev.payload) orelse return reply(s, ev.conn, 400, "{\"error\":\"bad request\"}");
    const q = std.mem.indexOfScalar(u8, req.target, '?');
    const raw_path = req.target[0 .. q orelse req.target.len];
    // n8n ignores a trailing slash.
    const path = if (raw_path.len > 1 and raw_path[raw_path.len - 1] == '/') raw_path[0 .. raw_path.len - 1] else raw_path;
    if (std.mem.startsWith(u8, path, "/resume/")) return resumeRoute(s, ev.conn, path["/resume/".len..], if (q) |i| req.target[i + 1 ..] else "", req.body, scratch);
    const ri = findRoute(s, req.method, path) orelse {
        s.log_modes[s.cur_event] = .skip;
        return reply(s, ev.conn, 404, "{\"error\":\"no route\"}");
    };
    const none_tier = s.modules[s.routes[ri].module].durability == .none;
    // The id comes from the reserved `none` block: nothing to log.
    if (none_tier) s.log_modes[s.cur_event] = .skip;
    if (!admit(s, ri)) {
        if (none_tier) s.log_modes[s.cur_event] = .skip;
        s.counters.rejected += 1;
        s.routes[ri].rejected += 1;
        return reply(s, ev.conn, 429, "{\"error\":\"rate limit\"}");
    }
    const t = scratch.begin();
    const query = if (q) |i| req.target[i + 1 ..] else "";
    // A module that never reads the request headers decodes a trigger
    // without them; the `started` action still gets the whole trigger.
    const with_headers = s.modules[s.routes[ri].module].trigger_headers;
    const trigger = webhookTrigger(scratch, &s.routes[ri], req, path, query, with_headers) catch |e| switch (e) {
        error.ArenaFull => return error.ArenaFull,
        error.BadMultipart => {
            t.end();
            if (none_tier) s.log_modes[s.cur_event] = .skip;
            return reply(s, ev.conn, 400, "{\"error\":\"the multipart body is not valid\"}");
        },
    };
    const full: ?[]const u8 = if (with_headers or !s.cfg.lifecycle) null else webhookTrigger(scratch, &s.routes[ri], req, path, query, true) catch |e| switch (e) {
        error.ArenaFull => return error.ArenaFull,
        error.BadMultipart => unreachable, // The same body parsed above.
    };
    const started = try startExecution(s, s.routes[ri].module, trigger, ev.conn, @intCast(ri), .{ .started_text = full }, scratch);
    // The started action holds the trigger bytes until the batch ends.
    if (!s.cfg.lifecycle) t.end();
    if (started) s.routes[ri].active += 1;
    if (!started and none_tier) s.log_modes[s.cur_event] = .skip;
}

pub const Request = struct { method: []const u8, target: []const u8, headers: []const u8, body: []const u8 };

pub fn splitRequest(payload: []const u8) ?Request {
    const nl = std.mem.indexOfScalar(u8, payload, '\n') orelse return null;
    const line = payload[0..nl];
    const sp = std.mem.indexOfScalar(u8, line, ' ') orelse return null;
    const rest = payload[nl + 1 ..];
    const nl2 = std.mem.indexOfScalar(u8, rest, '\n') orelse return null;
    return .{ .method = line[0..sp], .target = line[sp + 1 ..], .headers = rest[0..nl2], .body = rest[nl2 + 1 ..] };
}

/// The trigger of a webhook execution, close to n8n's webhook node output:
/// `{method, path, headers, params, query, body}`.
fn webhookTrigger(scratch: *Arena, r: *const Route, req: Request, path: []const u8, query: []const u8, with_headers: bool) error{ ArenaFull, BadMultipart }![]const u8 {
    var b = scratch.builder();
    errdefer b.abandon();
    try b.append("{\"method\":");
    try multipart.writeLossy(&b, req.method);
    try b.append(",\"path\":");
    try multipart.writeLossy(&b, path);
    try b.append(",\"headers\":");
    try b.append(if (req.headers.len == 0 or !with_headers) "{}" else req.headers);
    try b.append(",\"params\":{");
    if (r.dynamic) {
        var tpl = std.mem.tokenizeScalar(u8, r.path[0..r.path_len], '/');
        var got = std.mem.tokenizeScalar(u8, path, '/');
        var first = true;
        while (tpl.next()) |seg| {
            const v = got.next() orelse break;
            if (seg[0] != ':') continue;
            if (!first) try b.byte(',');
            first = false;
            try multipart.writeLossy(&b, seg[1..]);
            try b.byte(':');
            try writeDecoded(&b, v, false);
        }
    }
    try b.append("},\"query\":");
    // A repeated key gives an array, as n8n's query parser does.
    try multipart.writePairs(&b, query, '&', true);
    // One pass over the headers for both.
    const hv = module.jsonGet2(req.headers, "content-type", "content-disposition");
    const ct = module.jsonStr(hv[0]);
    const cd = module.jsonStr(hv[1]);
    try multipart.writeBody(&b, ct, cd, req.body, .{ .binary_property = r.bin_prop[0..r.bin_prop_len], .raw_body = r.raw_body, .binary_data = r.binary_data });
    try b.byte('}');
    return b.finish();
}

fn jsonStr(b: *@import("arena.zig").Builder, str: []const u8) error{ArenaFull}!void {
    json.writeString(b, str) catch return error.ArenaFull;
}

/// A JSON string of a percent-encoded URL part. `plus` turns `+` into a
/// space, as in a query. A bad escape stays as it is.
fn writeDecoded(b: *@import("arena.zig").Builder, raw: []const u8, plus: bool) error{ArenaFull}!void {
    var tmp: [max_path * 4]u8 = undefined;
    try multipart.writeLossy(b, multipart.decode(raw, plus, &tmp));
}

/// n8n's rules (`webhook.service.ts`): a static path matches exactly and
/// wins. Else a dynamic path with the same number of segments matches when
/// its fixed segments match by position and its other static segments are
/// all in the request; the most static segments wins, and a path of only
/// parameters matches when nothing else does.
pub fn findRoute(s: *const State, method: []const u8, path: []const u8) ?usize {
    for (s.routes[0..s.nroutes], 0..) |*r, i| {
        if (r.removed or r.dynamic) continue;
        if (std.mem.eql(u8, r.method[0..r.method_len], method) and std.mem.eql(u8, r.path[0..r.path_len], path)) return i;
    }
    var segs: [64][]const u8 = undefined;
    var nsegs: usize = 0;
    var it = std.mem.tokenizeScalar(u8, path, '/');
    while (it.next()) |seg| {
        if (nsegs == segs.len) return null;
        segs[nsegs] = seg;
        nsegs += 1;
    }
    var best: ?usize = null;
    var best_score: usize = 0;
    for (s.routes[0..s.nroutes], 0..) |*r, i| {
        if (r.removed or !r.dynamic or r.nsegs != nsegs) continue;
        if (!std.mem.eql(u8, r.method[0..r.method_len], method)) continue;
        const score = dynamicScore(r, segs[0..nsegs]) orelse continue;
        if (score > best_score or (best == null and score == 0)) {
            best = i;
            best_score = score;
        }
    }
    return best;
}

/// The count of static segments of a dynamic route that the request has,
/// or null when the route does not match.
fn dynamicScore(r: *const Route, segs: []const []const u8) ?usize {
    var tpl = std.mem.tokenizeScalar(u8, r.path[0..r.path_len], '/');
    var pos: usize = 0;
    var score: usize = 0;
    while (tpl.next()) |seg| : (pos += 1) {
        if (pos < r.fixed) {
            if (!std.mem.eql(u8, seg, segs[pos])) return null;
            continue;
        }
        if (seg[0] == ':') continue;
        // n8n compares the other static segments as a set.
        const found = for (segs[r.fixed..]) |x| {
            if (std.mem.eql(u8, x, seg)) break true;
        } else false;
        if (!found) return null;
        score += 1;
    }
    return score;
}

/// Token bucket and concurrency check, before any memory is taken.
fn admit(s: *State, ri: usize) bool {
    const r = &s.routes[ri];
    if (r.concurrency > 0 and r.active >= r.concurrency) return false;
    if (r.rate_per_s == 0) return true;
    const dt: f64 = @floatFromInt(@max(0, s.now_ms - r.last_ms));
    r.last_ms = s.now_ms;
    r.tokens = @min(@as(f64, @floatFromInt(r.burst)), r.tokens + dt * @as(f64, @floatFromInt(r.rate_per_s)) / 1000.0);
    if (r.tokens < 1) return false;
    r.tokens -= 1;
    return true;
}

/// POST /resume/<exec_id>/<seq> with a JSON body completes a waiting effect.
fn resumeRoute(s: *State, conn: u64, rest: []const u8, query: []const u8, body: []const u8, scratch: *Arena) StepError!void {
    var it = std.mem.splitScalar(u8, rest, '/');
    const id = parseExecId(it.next() orelse "") orelse return reply(s, conn, 400, "{\"error\":\"bad execution id\"}");
    // A resume needs the execution's signature (spec 9.4). Fixture runs and
    // tests have no secret and no signature.
    if (s.has_secret) {
        var sb: [32]u8 = undefined;
        const want = heap.resumeSignature(&s.secret, id, &sb);
        if (!heap.signatureEql(queryParam(query, "signature") orelse "", want)) return reply(s, conn, 403, "{\"error\":\"bad or missing signature\"}");
    }
    const seq_text = it.next() orelse "";
    if (s.by_exec.get(id) == null and s.parked.get(id) == null) return reply(s, conn, 404, "{\"error\":\"unknown execution\"}");
    const slot = s.by_exec.get(id) orelse {
        // The shell restores evicted executions before it delivers events.
        return reply(s, conn, 409, "{\"error\":\"execution is not loaded\"}");
    };
    // Without a seq, the URL is the execution's resume token (ctx.execution()
    // `resumeUrl`): it answers the one approval that waits now.
    const seq = if (seq_text.len > 0) std.fmt.parseInt(u32, seq_text, 10) catch return reply(s, conn, 400, "{\"error\":\"bad effect\"}") else waitingApproval(s, id, s.regions[slot].exec().next_effect) orelse return reply(s, conn, 409, "{\"error\":\"the execution does not wait for one approval\"}");
    try effectResult(s, .{ .kind = .effect_ok, .exec_id = id, .seq = seq, .payload = if (body.len == 0) "{\"approved\":true}" else body }, scratch);
    try reply(s, conn, 202, "{\"status\":\"resumed\"}");
}

/// The raw value of a query parameter. Signatures are hex, so they need no
/// decoding.
fn queryParam(query: []const u8, name: []const u8) ?[]const u8 {
    var it = std.mem.tokenizeScalar(u8, query, '&');
    while (it.next()) |pair| {
        const eq = std.mem.indexOfScalar(u8, pair, '=') orelse continue;
        if (std.mem.eql(u8, pair[0..eq], name)) return pair[eq + 1 ..];
    }
    return null;
}

/// The signature of an execution, or null when the shard has no secret.
pub fn resumeSignature(s: *const State, exec_id: u64, out: *[32]u8) ?[]const u8 {
    if (!s.has_secret) return null;
    return heap.resumeSignature(&s.secret, exec_id, out);
}

/// The seq of the only pending approval of an execution, or null when it
/// has none or several.
fn waitingApproval(s: *const State, id: u64, next_effect: u32) ?u32 {
    var found: ?u32 = null;
    var seq: u32 = 0;
    while (seq < next_effect) : (seq += 1) {
        const p = s.pending.get(.{ .exec_id = id, .seq = seq }) orelse continue;
        if (p.kind != .approval) continue;
        if (found != null) return null;
        found = seq;
    }
    return found;
}

fn reply(s: *State, conn: u64, status: u32, body: []const u8) StepError!void {
    return replyDur(s, conn, status, body, .batched);
}

fn replyDur(s: *State, conn: u64, status: u32, body: []const u8, dur: Durability) StepError!void {
    if (conn == 0) return;
    try emit(s, .{ .kind = .reply, .conn = conn, .aux = status, .payload = body, .durability = dur });
}

fn durOf(s: *const State, slot: SlotId) Durability {
    return s.modules[s.slot_module[slot]].durability;
}

// ---- execution lifecycle --------------------------------------------------------------

fn takeRegion(s: *State, class: u8) ?struct { idx: u32, region: heap.Region } {
    if (s.pool_nfree[class] == 0) return null;
    s.pool_nfree[class] -= 1;
    const idx = s.pool_free[class][s.pool_nfree[class]];
    if (std.debug.runtime_safety) {
        std.debug.assert(!s.pool_owned[class][idx]);
        s.pool_owned[class][idx] = true;
    }
    const size = s.cfg.region_sizes[class];
    const buf: []align(8) u8 = @alignCast(s.pools[class][@as(usize, idx) * size ..][0..size]);
    return .{ .idx = idx, .region = heap.Region.init(buf) };
}

/// Give a region back. `used`: the bytes it held. Safe builds fill them
/// with 0xAA and track ownership, so a stale offset reads poison and a
/// double release fails an assertion.
fn giveRegion(s: *State, class: u8, idx: u32, used: u32, owner: SlotId) void {
    std.debug.assert(s.pool_nfree[class] < s.pool_free[class].len);
    if (@import("builtin").mode == .debug) {
        // No other live slot may still use this entry (O(slots): Debug only).
        for (s.slot_state, 0..) |st, other| {
            if (other == owner or st == .free or s.slot_class[other] != class or s.slot_region_idx[other] != idx) continue;
            if (@intFromPtr(s.regions[other].buf.ptr) != @intFromPtr(s.pools[class].ptr) + @as(usize, idx) * s.cfg.region_sizes[class]) continue;
            std.debug.panic("region {d}/{d} released while slot {d} (exec {d}) uses it", .{ class, idx, other, s.slot_exec[other] });
        }
    }
    if (std.debug.runtime_safety) {
        std.debug.assert(s.pool_owned[class][idx]);
        s.pool_owned[class][idx] = false;
        const size = s.cfg.region_sizes[class];
        @memset(s.pools[class][@as(usize, idx) * size ..][0..@min(used, size)], 0xAA);
    }
    // Last in, first out: the next execution reuses memory still in cache.
    s.pool_free[class][s.pool_nfree[class]] = idx;
    s.pool_nfree[class] += 1;
}

fn takeSlot(s: *State) ?SlotId {
    if (s.nfree_slots == 0) return null;
    s.nfree_slots -= 1;
    return s.free_slots[s.nfree_slots];
}

/// The smallest region class with room for `used` bytes.
fn classFor(s: *const State, used: u32) u8 {
    var c: u8 = 0;
    while (c < 3 and s.cfg.region_sizes[c] < used) c += 1;
    return c;
}

fn releaseSlot(s: *State, slot: SlotId) void {
    s.modules[s.slot_module[slot]].start_class = classFor(s, s.regions[slot].used);
    giveRegion(s, s.slot_class[slot], s.slot_region_idx[slot], s.regions[slot].used, slot);
    s.map_removals += 1;
    _ = s.by_exec.remove(s.slot_exec[slot]);
    if (s.slot_route[slot] != 0xFFFF) {
        const r = &s.routes[s.slot_route[slot]];
        if (r.active > 0) r.active -= 1;
    }
    s.slot_state[slot] = .free;
    s.free_slots[s.nfree_slots] = slot;
    s.nfree_slots += 1;
}

fn markReady(s: *State, slot: SlotId) void {
    s.slot_long_wait[slot] = false;
    if (s.slot_state[slot] == .ready) return;
    s.slot_state[slot] = .ready;
    s.ready[s.nready] = slot;
    s.nready += 1;
}

pub fn vmFor(s: *State, slot: SlotId, scratch: *Arena) ops.Vm {
    const lm = &s.modules[s.slot_module[slot]];
    return .{ .r = &s.regions[slot], .m = s.moduleAt(s.slot_module[slot]), .scratch = scratch, .env = .{
        .resume_base = if (lm.resume_len > 0) lm.resume_base[0..lm.resume_len] else "/resume",
        .form_base = if (lm.form_len > 0) lm.form_base[0..lm.form_len] else "/resume",
        .secret = if (s.has_secret) &s.secret else null,
        .zones = s.zones[0..s.nzones],
        .zones_full = s.zones_full,
        .zones_cap = @intCast(s.zones.len),
    } };
}

fn execSeed(s: *const State, exec_id: u64) u64 {
    if (s.cfg.exact_seed) |seed| return seed;
    var x = s.cfg.seed ^ (exec_id *% 0x9E3779B97F4A7C15);
    _ = interp.nextRandom(&x);
    return x;
}

pub const StartOptions = struct {
    /// `heap.exec_flag_*` bits from the start event.
    flags: u32 = 0,
    /// The trigger text of the `started` action, when it differs from the
    /// text that is decoded (a trigger without its unread headers).
    started_text: ?[]const u8 = null,
    /// An id that n8n gave, or 0 to make one.
    id: u64 = 0,
    /// Reply on `conn` only when the start fails.
    quiet: bool = false,
};

/// Create an execution and decode its trigger. Returns false when the shard
/// has no slot or memory; the caller then replies with a limit status.
fn startExecution(s: *State, mod: u16, trigger: []const u8, conn: u64, route: u16, opts: StartOptions, scratch: *Arena) StepError!bool {
    if (mod >= s.nmodules or s.modules[mod].state != .live) {
        try reply(s, conn, 404, "{\"error\":\"unknown module\"}");
        return false;
    }
    if (opts.id != 0 and (opts.id & given_id_flag == 0 or s.knowsExecution(opts.id))) {
        try reply(s, conn, 409, "{\"error\":\"bad or used execution id\"}");
        return false;
    }
    const slot = takeSlot(s) orelse {
        try reply(s, conn, 503, "{\"error\":\"no execution slots\"}");
        return false;
    };
    const none_tier = s.modules[mod].durability == .none;
    if (opts.id == 0 and none_tier and s.next_none > s.none_reserved) {
        // A new block, logged and synced before this batch replies.
        s.none_reserved = s.next_none - 1 + s.cfg.none_id_block;
        try emit(s, .{ .kind = .reserve_none, .conn = s.none_reserved, .durability = .sync });
    }
    const exec_id = if (opts.id != 0)
        opts.id
    else if (none_tier)
        (@as(u64, s.cfg.shard_id) << 48) | none_id_flag | s.next_none
    else
        (@as(u64, s.cfg.shard_id) << 48) | s.next_exec;
    if (opts.id == 0) {
        if (none_tier) s.next_none += 1 else s.next_exec += 1;
    }
    // From the module's start class up, then the smaller classes.
    const first = s.modules[mod].start_class;
    var tries: u8 = 0;
    var class: u8 = first;
    while (tries < 4) : ({
        tries += 1;
        class = (first + tries) % 4;
    }) {
        const got = takeRegion(s, class) orelse continue;
        s.regions[slot] = got.region;
        s.slot_class[slot] = class;
        s.slot_region_idx[slot] = got.idx;
        s.slot_module[slot] = mod;
        var vm = vmFor(s, slot, scratch);
        const vars: ?[]const u8 = if (s.modules[mod].uses_vars) (if (s.vars_len > 0) s.vars_buf[0..s.vars_len] else "{}") else null;
        const statics: ?[]const u8 = if (s.modules[mod].wf_id_len > 0) s.statics.get(s.modules[mod].workflowId()) else null;
        if (initWithTrigger(&vm, exec_id, execSeed(s, exec_id), trigger, vars, statics)) |_| {
            break;
        } else |err| switch (err) {
            error.RegionFull => giveRegion(s, class, got.idx, s.regions[slot].used, slot),
            else => {
                giveRegion(s, class, got.idx, s.regions[slot].used, slot);
                s.free_slots[s.nfree_slots] = slot;
                s.nfree_slots += 1;
                try reply(s, conn, 400, "{\"error\":\"trigger is not valid JSON\"}");
                return false;
            },
        }
    } else {
        s.free_slots[s.nfree_slots] = slot;
        s.nfree_slots += 1;
        try reply(s, conn, 413, "{\"error\":\"trigger too large\"}");
        return false;
    }
    var flags = opts.flags & (heap.exec_flag_trace | heap.exec_flag_manual | heap.exec_flag_quiet);
    if (flags & heap.exec_flag_trace != 0 or s.modules[mod].save_data) flags |= heap.exec_flag_data;
    s.regions[slot].exec().flags = flags;
    modRef(s, mod);
    // A quiet poll run says `started` only when it finds items (`announce`).
    if (s.cfg.lifecycle and flags & heap.exec_flag_quiet == 0) {
        try emit(s, .{ .kind = .started, .exec_id = exec_id, .module = mod, .aux = flags, .payload = try scratchDupe(scratch, opts.started_text orelse trigger) });
    }
    s.slot_exec[slot] = exec_id;
    s.slot_route[slot] = route;
    s.slot_conn[slot] = if (opts.quiet) 0 else conn;
    s.slot_responded[slot] = false;
    s.slot_subscribed[slot] = false;
    s.slot_long_wait[slot] = false;
    s.slot_state[slot] = .parked;
    s.by_exec.putAssumeCapacity(exec_id, slot);
    s.counters.started += 1;
    markReady(s, slot);
    return true;
}

fn initWithTrigger(vm: *ops.Vm, exec_id: u64, seed: u64, trigger: []const u8, vars: ?[]const u8, statics: ?[]const u8) json.DecodeError!void {
    try interp.initExec(vm.r, vm.m, exec_id, seed);
    const tv = try json.decode(vm, trigger);
    interp.setTrigger(vm.r, tv);
    // Captured at start, so a replay sees the same variables and static data.
    if (vars) |v| vm.r.exec().vars = try vm.newStr(v);
    if (statics) |d| vm.r.exec().static_start = try vm.newStr(d);
}

/// A full region is first compacted into a fresh region of the same class:
/// the copy is the garbage collection, and a region of equal size cannot
/// overflow. Only when live data still fills more than half of it does the
/// execution move up a class, with a plain copy (offsets stay valid).
fn growRegion(s: *State, slot: SlotId) bool {
    const class = s.slot_class[slot];
    const same = takeRegion(s, class) orelse return promote(s, slot, class);
    var dst = same.region;
    heap.compact(&s.regions[slot], &dst) catch unreachable; // dst has the same size as the source.
    giveRegion(s, class, s.slot_region_idx[slot], s.regions[slot].used, slot);
    s.regions[slot] = dst;
    s.slot_region_idx[slot] = same.idx;
    s.counters.promotions += 1;
    if (dst.free() >= dst.buf.len / 2) return true;
    return promote(s, slot, class);
}

/// Copy the region verbatim into the next class that has a free region.
fn promote(s: *State, slot: SlotId, class: u8) bool {
    var next: u8 = class + 1;
    const got = while (next < 4) : (next += 1) {
        if (takeRegion(s, next)) |g| break g;
    } else return s.regions[slot].free() >= s.regions[slot].buf.len / 8;
    var dst = got.region;
    const used = s.regions[slot].used;
    @memcpy(dst.buf[0..used], s.regions[slot].buf[0..used]);
    dst.used = used;
    giveRegion(s, class, s.slot_region_idx[slot], used, slot);
    s.regions[slot] = dst;
    s.slot_class[slot] = next;
    s.slot_region_idx[slot] = got.idx;
    return true;
}

// ---- running --------------------------------------------------------------------------

fn runReady(s: *State, scratch: *Arena) StepError!void {
    // Group executions of the same module, so bytecode stays in cache.
    const list = s.ready[0..s.nready];
    std.sort.block(SlotId, list, s, struct {
        fn less(st: *State, a: SlotId, b: SlotId) bool {
            return st.slot_module[a] < st.slot_module[b];
        }
    }.less);
    const n = s.nready;
    s.nready = 0;
    // An entry can be stale: an event later in the batch finished the
    // execution and freed its slot. Do not bring a free slot back (found by
    // fuzzing: it ran a released region, and the slot was free and in use).
    for (list[0..n]) |slot| {
        if (s.slot_state[slot] == .ready) s.slot_state[slot] = .parked;
    }
    // Executions that run out of fuel go back on the ready list.
    var i: u32 = 0;
    while (i < n) : (i += 1) {
        try runOne(s, s.ready[i], scratch);
        debugCheckRoots(s, "runOne");
    }
}

/// Debug builds: every live slot holds a valid execution root after each
/// event and each run, so a corruption shows where it happens.
fn debugCheckRoots(s: *const State, where: []const u8) void {
    if (@import("builtin").mode != .debug) return;
    for (s.slot_state, 0..) |st, slot| {
        if (st == .free) continue;
        const e = s.regions[slot].at(heap.Exec, 0);
        if (e.magic != heap.exec_magic or e.exec_id != s.slot_exec[slot]) {
            std.debug.panic("after {s}: slot {d} (exec {d}, class {d}, region {d}, used {d}) has a bad execution root (magic {x})", .{ where, slot, s.slot_exec[slot], s.slot_class[slot], s.slot_region_idx[slot], s.regions[slot].used, e.magic });
        }
    }
}

fn runOne(s: *State, slot: SlotId, scratch: *Arena) StepError!void {
    if (s.slot_state[slot] == .free) return;
    if (std.debug.runtime_safety) {
        // Not `exec()`: it asserts the magic before this can report it.
        const e = s.regions[slot].at(heap.Exec, 0);
        if (e.magic != heap.exec_magic or e.nfibres == 0 or e.exec_id != s.slot_exec[slot]) {
            std.debug.panic("slot {d} (class {d}, region {d}, used {d}) has no valid execution root: magic {x}, nfibres {d}, exec {d} vs {d}", .{ slot, s.slot_class[slot], s.slot_region_idx[slot], s.regions[slot].used, e.magic, e.nfibres, e.exec_id, s.slot_exec[slot] });
        }
    }
    var fuel: u64 = s.cfg.fuel_per_exec_batch;
    const start_fuel = fuel;
    defer s.counters.instructions += start_fuel - fuel;
    var fulls: u8 = 0;
    while (true) {
        var vm = vmFor(s, slot, scratch);
        const t = scratch.begin();
        const out = interp.run(&vm, @floatFromInt(s.now_ms), &fuel, s.cfg.limits);
        switch (out) {
            .effect => |req| {
                fulls = 0;
                const keep = try handleEffect(s, slot, &vm, req, scratch);
                if (!keep) t.end();
                if (s.slot_state[slot] == .free) return;
            },
            .trace => |req| {
                // The action payload lives in scratch until the batch ends.
                fulls = 0;
                try traceAction(s, slot, &vm, req, scratch);
            },
            .idle => {
                t.end();
                return maybeEvictWaiting(s, slot, scratch);
            },
            .done, .failed => return finish(s, slot, if (out == .done) .done else .failed, scratch),
            .fuel_out => {
                t.end();
                markReadyLater(s, slot);
                return;
            },
            .region_full => {
                t.end();
                // A second full region in a row means one value is larger
                // than compaction frees: move up a class instead.
                const grown = if (fulls == 0) growRegion(s, slot) else promote(s, slot, s.slot_class[slot]);
                fulls += 1;
                if (!grown or fulls > 6) return finishLimit(s, slot, scratch);
                continue;
            },
            .limit => return finishLimit(s, slot, scratch),
        }
    }
}

fn markReadyLater(s: *State, slot: SlotId) void {
    // Appended after the current list; it runs in the next batch.
    s.slot_state[slot] = .ready;
    s.ready[s.nready] = slot;
    s.nready += 1;
}

/// Turn an effect request into actions. Returns true when scratch memory
/// must be kept for an action payload.
fn handleEffect(s: *State, slot: SlotId, vm: *ops.Vm, req: interp.EffectReq, scratch: *Arena) StepError!bool {
    s.counters.effects += 1;
    const exec_id = s.slot_exec[slot];
    const st = vm.m.steps[req.step];
    if (s.cfg.trace_effects) {
        const args = try encodeJson(vm, req.args, scratch);
        try emit(s, .{ .kind = .trace, .exec_id = exec_id, .seq = req.seq, .step = req.step, .effect_kind = req.kind, .module = s.slot_module[slot], .payload = args });
    }
    switch (req.kind) {
        .respond => {
            try respondNow(s, slot, vm, req.args, scratch);
            // The canvas shows the Respond node like any step: started with
            // its args, then completed at once.
            if (stepWatched(s, slot, .started)) {
                const data = s.regions[slot].exec().flags & heap.exec_flag_data != 0;
                const args = if (data) try encodeJson(vm, req.args, scratch) else "";
                try statusEvent(s, slot, req.step, .started, args, 0);
                try statusEvent(s, slot, req.step, .completed, "", 0);
            }
            interp.resumeEffect(vm, req.fibre, value.undef, false);
            return true;
        },
        .wait => {
            const ms = waitMs(vm, req.args, s.now_ms);
            try addTimer(s, .{ .at_ms = s.now_ms + ms, .exec_id = exec_id, .seq = req.seq, .kind = .wait });
            if (ms >= s.cfg.evict_wait_ms) s.slot_long_wait[slot] = true;
            try statusEvent(s, slot, req.step, .waiting, "", s.now_ms + ms);
            // The trace payload lives in scratch until the batch ends.
            return s.cfg.trace_effects;
        },
        else => {},
    }
    // A full table of effects in flight ends this execution with `limit`,
    // not the shard.
    if (s.pending.count() >= s.cfg.max_pending) {
        try finishLimit(s, slot, scratch);
        return true;
    }
    const payload = try withStatic(vm, try encodeJson(vm, req.args, scratch), req.kind, scratch);
    s.pending.putAssumeCapacity(.{ .exec_id = exec_id, .seq = req.seq }, .{ .attempt = 0, .step = req.step, .occurrence = req.occurrence, .kind = req.kind });
    if (req.kind == .approval) s.slot_long_wait[slot] = true;
    var a: Action = .{
        .kind = .dispatch,
        .durability = s.modules[s.slot_module[slot]].durability,
        .effect_kind = req.kind,
        .exec_id = exec_id,
        .seq = req.seq,
        .step = req.step,
        .module = s.slot_module[slot],
        .idempotent = st.idempotent != 0,
        .payload = payload,
    };
    idempotencyKey(exec_id, vm.m.str(st.id), req.occurrence, &a.key);
    try emit(s, a);
    try statusEvent(s, slot, req.step, .started, payload, 0);
    return true;
}

/// A host step whose args have `staticData: true` gets the execution's
/// static data as `$staticData` (spec 9.7): the working copy when a step
/// changed it, else the document at the start.
fn withStatic(vm: *ops.Vm, args: []const u8, kind: module.EffectKind, scratch: *Arena) StepError![]const u8 {
    if (kind != .node and kind != .code) return args;
    const flag = module.jsonGet(args, "staticData") orelse return args;
    if (!std.mem.eql(u8, flag, "true") or args.len < 2 or args[args.len - 1] != '}') return args;
    const e = vm.r.exec();
    const doc: []const u8 = if (e.static_doc != value.undef)
        try encodeJson(vm, e.static_doc, scratch)
    else if (value.kindOf(e.static_start) == .string) vm.str(e.static_start) else "{}";
    return joinScratch(scratch, &.{ args[0 .. args.len - 1], ",\"$staticData\":", doc, "}" });
}

fn joinScratch(scratch: *Arena, parts: []const []const u8) StepError![]const u8 {
    var b = scratch.builder();
    for (parts) |p| b.append(p) catch return error.ArenaFull;
    return b.finish();
}

fn waitMs(vm: *ops.Vm, args: Value, now_ms: i64) i64 {
    if (value.kindOf(args) != .object) return 0;
    const d = vm.objGet(value.payload(args), "duration");
    if (value.kindOf(d) == .number) return @intFromFloat(@max(0, value.asNum(d)));
    const u = vm.objGet(value.payload(args), "until");
    if (value.kindOf(u) == .number) return @max(0, @as(i64, @intFromFloat(value.asNum(u))) - now_ms);
    return 0;
}

fn respondNow(s: *State, slot: SlotId, vm: *ops.Vm, args: Value, scratch: *Arena) StepError!void {
    if (s.slot_responded[slot]) return;
    s.slot_responded[slot] = true;
    var status: u32 = 200;
    var body = value.undef;
    var binary = false;
    var headers = value.undef;
    if (value.kindOf(args) == .object) {
        const hv = vm.objGet(value.payload(args), "headers");
        if (value.kindOf(hv) == .object) headers = hv;
        const sv = vm.objGet(value.payload(args), "status");
        if (value.kindOf(sv) == .number) status = @intFromFloat(value.asNum(sv));
        body = vm.objGet(value.payload(args), "body");
        // `binary: { data, mimeType, fileName? }` replaces the body: the shell
        // sends the decoded bytes (spec 9.1).
        const bin = vm.objGet(value.payload(args), "binary");
        if (value.kindOf(bin) == .object) {
            body = bin;
            binary = true;
        }
    }
    if (s.slot_conn[slot] == 0) return;
    var payload = try encodeJson(vm, body, scratch);
    var flags: u32 = if (binary) reply_binary else 0;
    if (headers != value.undef) {
        // The shell checks the header names and values (spec 9.1).
        const h = try encodeJson(vm, headers, scratch);
        var b = scratch.builder();
        b.append("{\"headers\":") catch return error.ArenaFull;
        b.append(h) catch return error.ArenaFull;
        b.append(",\"body\":") catch return error.ArenaFull;
        b.append(payload) catch return error.ArenaFull;
        b.byte('}') catch return error.ArenaFull;
        payload = b.finish();
        flags |= reply_headers;
    }
    try emit(s, .{ .kind = .reply, .conn = s.slot_conn[slot], .aux = status, .payload = payload, .durability = durOf(s, slot), .seq = flags });
}

/// `Action.seq` bits of a reply. `reply_binary`: the body is
/// `{ data: <base64>, mimeType?, fileName? }`; the shell sends the decoded
/// bytes. `reply_headers`: the payload is `{ headers, body }`.
pub const reply_binary: u32 = 1;
pub const reply_headers: u32 = 2;

fn encodeJson(vm: *ops.Vm, v: Value, scratch: *Arena) StepError![]const u8 {
    var b = scratch.builder();
    const wrote = json.encode(vm, &b, v, "") catch |e| switch (e) {
        error.ArenaFull => return error.ArenaFull,
        // Circular or too deep data cannot be sent; send null instead.
        else => blk: {
            b.abandon();
            b = scratch.builder();
            break :blk false;
        },
    };
    if (!wrote) b.append("null") catch return error.ArenaFull;
    return b.finish();
}

pub fn idempotencyKey(exec_id: u64, step_id: []const u8, occurrence: u32, out: *[32]u8) void {
    var h = std.crypto.hash.sha2.Sha256.init(.{});
    var b8: [8]u8 = undefined;
    std.mem.writeInt(u64, &b8, exec_id, .little);
    h.update(&b8);
    h.update(step_id);
    var b4: [4]u8 = undefined;
    std.mem.writeInt(u32, &b4, occurrence, .little);
    h.update(&b4);
    var d: [32]u8 = undefined;
    h.final(&d);
    const hex = std.fmt.bytesToHex(d[0..16], .lower);
    @memcpy(out, &hex);
}

/// `payload`: the args, result or error message of the step. It goes out
/// only when the execution has `exec_flag_data`. `wake_ms`: the end of a wait.
fn scratchOf(s: *State) *Arena {
    return s.batch_scratch orelse unreachable;
}

/// The `started` event of a poll run that found items (spec 9.8), with the
/// items as the trigger. It goes out before any other event of the run.
fn announce(s: *State, slot: SlotId, scratch: *Arena) StepError!void {
    const e = s.regions[slot].exec();
    if (e.flags & heap.exec_flag_announce == 0) return;
    e.flags &= ~heap.exec_flag_announce;
    if (!s.cfg.lifecycle) return;
    var vm = vmFor(s, slot, scratch);
    const trigger = if (e.trigger == value.undef) "" else try encodeJson(&vm, e.trigger, scratch);
    try emit(s, .{ .kind = .started, .exec_id = s.slot_exec[slot], .module = s.slot_module[slot], .aux = e.flags, .payload = trigger });
}

fn statusEvent(s: *State, slot: SlotId, step_idx: u32, st: StepStatus, payload: []const u8, wake_ms: i64) StepError!void {
    // A quiet poll run has no events yet (spec 9.8).
    if (s.regions[slot].exec().flags & heap.exec_flag_quiet != 0) return;
    try announce(s, slot, scratchOf(s));
    // Status events cost nothing unless someone watches this execution.
    if (!stepWatched(s, slot, st)) return;
    const data = s.regions[slot].exec().flags & heap.exec_flag_data != 0;
    try emit(s, .{ .kind = .status, .exec_id = s.slot_exec[slot], .step = step_idx, .aux = @backingInt(st), .module = s.slot_module[slot], .conn = @bitCast(wake_ms), .payload = if (data) payload else "" });
}

/// Step events (spec 9.2) go out for an execution that someone watches: a
/// client subscribed to it, or it has data (`trace`, `saveData`). Other
/// executions give `started` and `finished` only, and step events for a
/// sample of 1 in `step_event_sample`. Failures and waits always go out:
/// they are rare, and n8n shows them. The choice depends on the execution
/// id only, so a replay makes the same events.
fn stepWatched(s: *const State, slot: SlotId, st: StepStatus) bool {
    if (s.slot_subscribed[slot]) return true;
    if (!s.cfg.lifecycle) return false;
    if (st == .failed or st == .waiting) return true;
    if (s.regions[slot].exec().flags & heap.exec_flag_data != 0) return true;
    const n = s.cfg.step_event_sample;
    return n > 0 and s.slot_exec[slot] % n == 0;
}

/// A ctx.trace call: copy the items to JSON for the trace action.
fn traceAction(s: *State, slot: SlotId, vm: *ops.Vm, req: interp.TraceReq, scratch: *Arena) StepError!void {
    if (s.regions[slot].exec().flags & heap.exec_flag_quiet != 0) return;
    try announce(s, slot, scratch);
    const items = try encodeJson(vm, req.items, scratch);
    var b = scratch.builder();
    b.append("{\"step\":") catch return error.ArenaFull;
    json.writeString(&b, vm.str(req.name)) catch return error.ArenaFull;
    b.append(",\"items\":") catch return error.ArenaFull;
    b.append(items) catch return error.ArenaFull;
    b.byte('}') catch return error.ArenaFull;
    try emit(s, .{ .kind = .trace_items, .exec_id = s.slot_exec[slot], .module = s.slot_module[slot], .payload = b.finish() });
}

fn finish(s: *State, slot: SlotId, status_in: heap.ExecStatus, scratch: *Arena) StepError!void {
    var status = status_in;
    const quiet = s.regions[slot].exec().flags & heap.exec_flag_quiet != 0;
    // A poll run that ends without items is skipped: it keeps its cursor and
    // sends no events. A poll that fails is reported, as v1 reports it.
    if (quiet and status == .done) status = .skipped;
    if (quiet and status != .skipped) {
        s.regions[slot].exec().flags = (s.regions[slot].exec().flags & ~heap.exec_flag_quiet) | heap.exec_flag_announce;
    }
    try announce(s, slot, scratch);
    var vm = vmFor(s, slot, scratch);
    const e = s.regions[slot].exec();
    e.status = status;
    // n8n keeps the static data of runs that succeed and of runs that fail,
    // not of cancelled runs (spec 9.7). A skipped poll keeps its cursor.
    if (status == .done or status == .failed or status == .skipped) try commitStatic(s, slot, &vm, scratch);
    // An undefined result has an empty payload; a reply sends no body.
    const payload: []const u8 = if (e.result == value.undef) "" else try encodeJson(&vm, e.result, scratch);
    if (status == .done or status == .skipped) s.counters.finished_ok += 1 else s.counters.finished_failed += 1;
    if (!s.slot_responded[slot]) {
        s.slot_responded[slot] = true;
        try replyDur(s, s.slot_conn[slot], if (status == .done or status == .skipped) 200 else 500, payload, durOf(s, slot));
    }
    try emit(s, .{ .kind = .finished, .exec_id = s.slot_exec[slot], .aux = @backingInt(status), .module = s.slot_module[slot], .payload = payload, .durability = durOf(s, slot) });
    dropPending(s, s.slot_exec[slot], s.regions[slot].exec().next_effect);
    modUnref(s, s.slot_module[slot]);
    releaseSlot(s, slot);
}

fn finishLimit(s: *State, slot: SlotId, scratch: *Arena) StepError!void {
    var vm = vmFor(s, slot, scratch);
    const e = s.regions[slot].exec();
    e.status = .limit;
    // The region may be full: report the limit without allocating in it.
    _ = &vm;
    s.counters.finished_failed += 1;
    if (!s.slot_responded[slot]) {
        s.slot_responded[slot] = true;
        try replyDur(s, s.slot_conn[slot], 500, "{\"error\":\"limit\"}", durOf(s, slot));
    }
    try emit(s, .{ .kind = .finished, .exec_id = s.slot_exec[slot], .aux = @backingInt(heap.ExecStatus.limit), .module = s.slot_module[slot], .payload = "{\"error\":\"limit\"}", .durability = durOf(s, slot) });
    dropPending(s, s.slot_exec[slot], s.regions[slot].exec().next_effect);
    modUnref(s, s.slot_module[slot]);
    releaseSlot(s, slot);
}

/// Remove the pending rows of a finished execution. Its effects are
/// numbered 0..next_effect, so no table scan is needed.
fn dropPending(s: *State, exec_id: u64, next_effect: u32) void {
    var seq: u32 = 0;
    while (seq < next_effect) : (seq += 1) {
        if (s.pending.remove(.{ .exec_id = exec_id, .seq = seq })) s.pending_removals += 1;
    }
}

// ---- effect results ---------------------------------------------------------------

fn effectResult(s: *State, ev: Event, scratch: *Arena) StepError!void {
    const slot = s.by_exec.get(ev.exec_id) orelse return;
    if (s.modules[s.slot_module[slot]].durability == .none) s.log_modes[s.cur_event] = .skip;
    const key: EffectKey = .{ .exec_id = ev.exec_id, .seq = ev.seq };
    // One lookup: the entry stays valid until it is removed below, because
    // nothing in between adds or removes pending rows.
    const pend_entry = s.pending.getEntry(key) orelse return; // Late or duplicate result.
    const pend = pend_entry.value_ptr.*;
    var vm = vmFor(s, slot, scratch);
    const fi = interp.fibreForEffect(&vm, ev.seq) orelse return;
    const st = vm.m.steps[pend.step];
    if (ev.kind == .effect_err and pend.attempt < st.retry_max) {
        pend_entry.value_ptr.attempt += 1;
        try addTimer(s, .{ .at_ms = s.now_ms + if (s.cfg.immediate_retries) 0 else st.retry_delay_ms, .exec_id = ev.exec_id, .seq = ev.seq, .kind = .retry });
        try statusEvent(s, slot, pend.step, .retrying, ev.payload, 0);
        return;
    }
    // Decode into the region; grow it when the result does not fit.
    var attempts: u32 = 0;
    while (attempts < 6) : (attempts += 1) {
        vm = vmFor(s, slot, scratch);
        // Decoding may use scratch for a moment; the value lives in the
        // region. The temp ends before anything below emits an action whose
        // payload is in scratch (an eviction's snapshot).
        const t = scratch.begin();
        var body_text = false;
        const decoded = resultValue(&vm, ev, vm.m.str(st.name), &body_text, stepReads(s, slot, pend.step));
        // A host step that changed the static data sends the new document
        // after its result: `aux` is the result length plus one.
        const statics = if (decoded) |_| staticOfResult(&vm, ev) else |err| err;
        t.end();
        _ = statics catch |e| switch (e) {
            error.RegionFull => {
                const grown = if (attempts == 0) growRegion(s, slot) else promote(s, slot, s.slot_class[slot]);
                if (!grown) return finishLimit(s, slot, scratch);
                continue;
            },
            else => {},
        };
        const v = decoded catch |e| switch (e) {
            error.RegionFull => {
                // Compaction first; after that only a larger class helps.
                const grown = if (attempts == 0) growRegion(s, slot) else promote(s, slot, s.slot_class[slot]);
                if (!grown) return finishLimit(s, slot, scratch);
                continue;
            },
            error.Syntax => value.undef,
            else => return finishLimit(s, slot, scratch),
        };
        if (ev.kind == .effect_err and !interp.inTry(&vm, fi)) {
            // The step event carries the error; the attention event names only the step.
            try statusEvent(s, slot, pend.step, .failed, ev.payload, 0);
            // The pending row stays: an operator retry sends this effect again.
            return needsAttention(s, slot, fi, pend.step, scratch);
        }
        s.pending_removals += 1;
        s.pending.removeByPtr(pend_entry.key_ptr);
        interp.resumeEffect(&vm, fi, v, ev.kind == .effect_err);
        try statusEvent(s, slot, pend.step, if (ev.kind == .effect_ok) .completed else .failed, try resultText(s, slot, ev, body_text, scratch), 0);
        markReady(s, slot);
        return;
    }
    return finishLimit(s, slot, scratch);
}

/// The members of an HTTP result that the step's code can read (step flags).
pub const ResultReads = struct { headers: bool = true, body: bool = true };

fn stepReads(s: *const State, slot: SlotId, step_idx: u32) ResultReads {
    const m = s.moduleAt(s.slot_module[slot]);
    std.debug.assert(step_idx < m.steps.len);
    const flags = m.steps[step_idx].flags;
    // The step event of an execution with data holds the result text, and
    // whether its body was JSON is known only after a decode.
    const data = s.regions[slot].exec().flags & heap.exec_flag_data != 0;
    return .{
        .headers = data or flags & module.step_flag_result_headers_unread == 0,
        .body = data or flags & module.step_flag_result_body_unread == 0,
    };
}

fn resultValue(vm: *ops.Vm, ev: Event, step_name: []const u8, body_text: *bool, reads: ResultReads) json.DecodeError!Value {
    if (ev.kind == .effect_ok) {
        if (rawBody(ev)) |rb| return rawResult(vm, rb.head, rb.body, body_text, reads);
        // A result sent as one text: with both flags, only its status is
        // decoded; a text without a status decodes as it is.
        if (!reads.headers and !reads.body) {
            if (partialResult(vm, resultPart(ev), reads)) |v| return v else |e| if (e != error.Syntax) return e;
        }
        return json.decode(vm, resultPart(ev));
    }
    const o = try vm.r.newObject(3);
    try vm.objSet(value.payload(o), try vm.newStr("name"), try vm.newStr("NodeError"));
    try vm.objSet(value.payload(o), try vm.newStr("message"), try vm.newStr(ev.payload));
    try vm.objSet(value.payload(o), try vm.newStr("step"), try vm.newStr(step_name));
    return o;
}

const RawBody = struct { head: []const u8, body: []const u8 };

/// The head and raw body of a result with `raw_body_flag`. A bad length gives
/// null, and the payload then decodes as it is (and fails as a syntax error).
fn rawBody(ev: Event) ?RawBody {
    if (ev.kind != .effect_ok or ev.aux & raw_body_flag == 0) return null;
    const n = ev.aux & ~raw_body_flag;
    if (n < 2 or n > ev.payload.len or ev.payload[n - 1] != '}') return null;
    return .{ .head = ev.payload[0..n], .body = ev.payload[n..] };
}

/// `{status, headers, body}` from the head and the raw body. The body is
/// one JSON value, parsed alone so that it cannot add members to the head;
/// a body that does not parse becomes its text, through the same JSON
/// string escape that the shell used (`body_text` is then set). A body
/// that the code never reads is not parsed, and the value has no `body`.
fn rawResult(vm: *ops.Vm, head: []const u8, body: []const u8, body_text: *bool, reads: ResultReads) json.DecodeError!Value {
    const o = if (reads.headers) try json.decode(vm, head) else try partialResult(vm, head, reads);
    if (value.kindOf(o) != .object) return error.Syntax;
    // No step event text needs `body_text` then (`effectResult`).
    if (!reads.body) return o;
    const b = json.decode(vm, body) catch |e| switch (e) {
        error.Syntax => blk: {
            body_text.* = true;
            const t = vm.scratch.begin();
            defer t.end();
            var sb = vm.scratch.builder();
            try json.writeString(&sb, body);
            // Finished, so the decoder's own scratch use starts after it.
            break :blk try json.decode(vm, sb.finish());
        },
        else => return e,
    };
    try vm.objSet(value.payload(o), try keyString(vm, "body"), b);
    return o;
}

/// `{status, headers: {}}` from a result head, for a step whose code never
/// reads the headers: only the status is decoded. The keys keep their order.
fn partialResult(vm: *ops.Vm, text: []const u8, reads: ResultReads) json.DecodeError!Value {
    std.debug.assert(!reads.headers);
    std.debug.assert(text.len > 0);
    const raw = module.jsonGet(text, "status") orelse return error.Syntax;
    const status = try json.decode(vm, raw);
    const o = try vm.r.newObject(3);
    try vm.objSet(value.payload(o), try keyString(vm, "status"), status);
    try vm.objSet(value.payload(o), try keyString(vm, "headers"), try vm.r.newObject(0));
    return o;
}

/// A key: the module's own string when it has one (a property read then
/// matches by identity), else a new string.
fn keyString(vm: *ops.Vm, key: []const u8) ops.Err!Value {
    if (vm.m.internKey(key, simd_json.hashKey(key))) |si| return value.constString(si);
    return vm.newStr(key);
}

/// The result text for a step event, as the shell wrote it before
/// `raw_body_flag`: built only when the event carries data.
fn resultText(s: *State, slot: SlotId, ev: Event, body_text: bool, scratch: *Arena) StepError![]const u8 {
    const rb = rawBody(ev) orelse return resultPart(ev);
    if (s.regions[slot].exec().flags & heap.exec_flag_data == 0) return "";
    var b = scratch.builder();
    errdefer b.abandon();
    try b.append(rb.head[0 .. rb.head.len - 1]);
    try b.append(",\"body\":");
    if (body_text) {
        json.writeString(&b, rb.body) catch return error.ArenaFull;
    } else {
        try b.append(std.mem.trim(u8, rb.body, " \t\r\n"));
    }
    try b.byte('}');
    return b.finish();
}

fn resultPart(ev: Event) []const u8 {
    if (ev.kind != .effect_ok or ev.aux == 0 or ev.aux & raw_body_flag != 0 or ev.aux - 1 > ev.payload.len) return ev.payload;
    return ev.payload[0 .. ev.aux - 1];
}

/// The static data document after a host step's result, into the working copy.
fn staticOfResult(vm: *ops.Vm, ev: Event) json.DecodeError!void {
    if (ev.kind != .effect_ok or ev.aux == 0 or ev.aux & raw_body_flag != 0 or ev.aux - 1 > ev.payload.len) return;
    const doc = ev.payload[ev.aux - 1 ..];
    const v = json.decode(vm, doc) catch |e| switch (e) {
        error.RegionFull => return error.RegionFull,
        else => return,
    };
    if (value.kindOf(v) == .object) vm.r.exec().static_doc = v;
}

fn needsAttention(s: *State, slot: SlotId, fi: u32, step_idx: u32, scratch: *Arena) StepError!void {
    // A poll run that stops on a step is reported (spec 9.8).
    const ef = &s.regions[slot].exec().flags;
    if (ef.* & heap.exec_flag_quiet != 0) ef.* = (ef.* & ~heap.exec_flag_quiet) | heap.exec_flag_announce;
    try announce(s, slot, scratch);
    const e = s.regions[slot].exec();
    e.status = .needs_attention;
    e.attention_fibre = fi;
    e.attention_step = step_idx;
    var a: Action = .{ .kind = .attention, .exec_id = s.slot_exec[slot], .step = step_idx, .module = s.slot_module[slot], .durability = durOf(s, slot) };
    var vm = vmFor(s, slot, scratch);
    const req = interp.pendingEffect(&vm, fi);
    a.seq = req.seq;
    if (s.pending.get(.{ .exec_id = a.exec_id, .seq = req.seq })) |p| {
        idempotencyKey(a.exec_id, vm.m.str(vm.m.steps[step_idx].id), p.occurrence, &a.key);
    } else @memset(&a.key, '0');
    try emit(s, a);
    if (!s.slot_responded[slot]) {
        s.slot_responded[slot] = true;
        try reply(s, s.slot_conn[slot], 500, "{\"status\":\"needs_attention\"}");
    }
    try evict(s, slot, true, scratch);
}

fn operator(s: *State, ev: Event, scratch: *Arena) StepError!void {
    const slot = s.by_exec.get(ev.exec_id) orelse return;
    const e = s.regions[slot].exec();
    if (e.status != .needs_attention) return;
    var vm = vmFor(s, slot, scratch);
    const fi = e.attention_fibre;
    const step_idx = e.attention_step;
    e.status = .ready;
    switch (@as(OperatorAction, @fromBackingInt(@intCast(ev.aux)))) {
        .retry => {
            // Re-dispatch the one effect the execution is parked on.
            const req = interp.pendingEffect(&vm, fi);
            const exec_id = s.slot_exec[slot];
            const pk: EffectKey = .{ .exec_id = exec_id, .seq = req.seq };
            const pend = s.pending.get(pk) orelse return;
            s.pending.getPtr(pk).?.attempt = pend.attempt + 1;
            const payload = try encodeJson(&vm, req.args, scratch);
            var a: Action = .{ .kind = .dispatch, .effect_kind = req.kind, .exec_id = exec_id, .seq = req.seq, .step = step_idx, .module = s.slot_module[slot], .attempt = pend.attempt + 1, .payload = payload };
            a.durability = s.modules[s.slot_module[slot]].durability;
            a.idempotent = vm.m.steps[step_idx].idempotent != 0;
            idempotencyKey(exec_id, vm.m.str(vm.m.steps[step_idx].id), pend.occurrence, &a.key);
            try emit(s, a);
        },
        .skip => {
            const t = scratch.begin();
            defer t.end();
            const v = json.decode(&vm, if (ev.payload.len == 0) "null" else ev.payload) catch value.undef;
            s.pending_removals += 1;
            _ = s.pending.remove(.{ .exec_id = s.slot_exec[slot], .seq = interp.pendingEffect(&vm, fi).seq });
            interp.resumeEffect(&vm, fi, v, false);
            markReady(s, slot);
        },
        .fail => {
            const msg = vm.newStr("failed by operator") catch value.undef;
            interp.resumeEffect(&vm, fi, msg, true);
            // A failure chosen by an operator is not caught by workflow code.
            return finish(s, slot, .failed, scratch);
        },
    }
}

fn cancel(s: *State, exec_id: u64, scratch: *Arena) StepError!void {
    const slot = s.by_exec.get(exec_id) orelse return;
    s.regions[slot].exec().result = value.undef;
    try finish(s, slot, .cancelled, scratch);
}

// ---- timers -----------------------------------------------------------------------

fn addTimer(s: *State, t: Timer) StepError!void {
    if (s.ntimers == s.timers.len) return error.ActionsFull;
    // Binary min-heap on (at_ms, exec_id, seq): deterministic order.
    var i = s.ntimers;
    s.timers[i] = t;
    s.ntimers += 1;
    while (i > 0) {
        const p = (i - 1) / 2;
        if (!timerLess(s.timers[i], s.timers[p])) break;
        std.mem.swap(Timer, &s.timers[i], &s.timers[p]);
        i = p;
    }
}

fn timerLess(a: Timer, b: Timer) bool {
    if (a.at_ms != b.at_ms) return a.at_ms < b.at_ms;
    if (a.exec_id != b.exec_id) return a.exec_id < b.exec_id;
    return a.seq < b.seq;
}

fn popTimer(s: *State) Timer {
    std.debug.assert(s.ntimers > 0);
    const top = s.timers[0];
    s.ntimers -= 1;
    s.timers[0] = s.timers[s.ntimers];
    var i: u32 = 0;
    while (true) {
        const l = 2 * i + 1;
        const r = l + 1;
        var m = i;
        if (l < s.ntimers and timerLess(s.timers[l], s.timers[m])) m = l;
        if (r < s.ntimers and timerLess(s.timers[r], s.timers[m])) m = r;
        if (m == i) break;
        std.mem.swap(Timer, &s.timers[i], &s.timers[m]);
        i = m;
    }
    return top;
}

fn fireTimers(s: *State, scratch: *Arena) StepError!void {
    var deferred: [64]Timer = undefined;
    var nd: usize = 0;
    while (s.ntimers > 0 and s.timers[0].at_ms <= s.now_ms) {
        const t = popTimer(s);
        const slot = s.by_exec.get(t.exec_id) orelse {
            if (s.parked.get(t.exec_id) != null) {
                // Evicted: ask the shell for the snapshot, fire next batch.
                try emit(s, .{ .kind = .wake, .exec_id = t.exec_id });
                if (nd < deferred.len) {
                    deferred[nd] = t;
                    nd += 1;
                }
            }
            continue;
        };
        try fireTimer(s, slot, t, scratch);
    }
    // Same due time: the timer fires in the next batch, after the restore.
    for (deferred[0..nd]) |t| try addTimer(s, t);
}

fn fireTimer(s: *State, slot: SlotId, t: Timer, scratch: *Arena) StepError!void {
    var vm = vmFor(s, slot, scratch);
    const fi = interp.fibreForEffect(&vm, t.seq) orelse return;
    switch (t.kind) {
        .wait => {
            interp.resumeEffect(&vm, fi, value.undef, false);
            markReady(s, slot);
        },
        .retry => {
            const pend = s.pending.get(.{ .exec_id = t.exec_id, .seq = t.seq }) orelse return;
            const req = interp.pendingEffect(&vm, fi);
            const payload = try encodeJson(&vm, req.args, scratch);
            var a: Action = .{ .kind = .dispatch, .effect_kind = pend.kind, .exec_id = t.exec_id, .seq = t.seq, .step = pend.step, .module = s.slot_module[slot], .attempt = pend.attempt, .payload = payload };
            a.durability = s.modules[s.slot_module[slot]].durability;
            a.idempotent = vm.m.steps[pend.step].idempotent != 0;
            idempotencyKey(t.exec_id, vm.m.str(vm.m.steps[pend.step].id), pend.occurrence, &a.key);
            if (s.cfg.trace_effects) try emit(s, .{ .kind = .trace, .exec_id = t.exec_id, .seq = t.seq, .step = pend.step, .effect_kind = pend.kind, .module = s.slot_module[slot], .payload = payload });
            try emit(s, a);
        },
    }
}

// ---- eviction and restore --------------------------------------------------------

pub const SnapHeader = extern struct {
    magic: u32,
    version: u32,
    exec_id: u64,
    module_hash: [32]u8,
    len: u32,
    checksum: u32,
    attention: u32,
    _pad: u32,
};
pub const snap_magic: u32 = 0x50414E53;
/// 2: the execution root has the static data fields (128 bytes), and the
/// checksum is `logfmt.checksum` (XXH3), not CRC-32.
pub const snap_version: u32 = 2;

comptime {
    // Both go into the log: add_route payloads and snapshots.
    std.debug.assert(@sizeOf(RouteSpec) == 24);
    std.debug.assert(@sizeOf(SnapHeader) == 64);
}

/// Long waits leave memory: approvals always, waits above the threshold.
fn maybeEvictWaiting(s: *State, slot: SlotId, scratch: *Arena) StepError!void {
    if (s.slot_long_wait[slot]) try evict(s, slot, false, scratch);
}

fn evict(s: *State, slot: SlotId, attention: bool, scratch: *Arena) StepError!void {
    // A full parked table: the execution stays in memory (found by a load
    // test: the table overflowed and the shard stopped).
    if (s.parked.count() >= s.cfg.max_parked) return;
    const src = &s.regions[slot];
    // The compacted copy is never larger than the source.
    if (s.parked_bytes + snapFootprint(@sizeOf(SnapHeader) + src.used) > s.cfg.snap_bytes) return;
    const words = scratch.push(u64, (src.used + @sizeOf(SnapHeader) + 7) / 8) catch return error.ArenaFull;
    const out = std.mem.sliceAsBytes(words);
    const body: []align(8) u8 = @alignCast(out[@sizeOf(SnapHeader)..][0..src.used]);
    var dst = heap.Region.init(body);
    heap.compact(src, &dst) catch unreachable; // A compacting copy never needs more space than the source used.
    const lm = &s.modules[s.slot_module[slot]];
    const h: SnapHeader = .{
        .magic = snap_magic,
        .version = snap_version,
        .exec_id = s.slot_exec[slot],
        .module_hash = lm.m.hash,
        .len = dst.used,
        .checksum = @import("logfmt.zig").checksum(body[0..dst.used]),
        .attention = @intFromBool(attention),
        ._pad = 0,
    };
    @memcpy(out[0..@sizeOf(SnapHeader)], std.mem.asBytes(&h));
    const snap = out[0 .. @sizeOf(SnapHeader) + dst.used];
    const foot = snapFootprint(snap.len);
    s.parked.putAssumeCapacity(s.slot_exec[slot], .{
        .module = s.slot_module[slot],
        .attention = attention,
        .bytes = @intCast(foot),
        // The reply waits for the execution's end, which can come after a
        // restore (a long wait on the webhook's connection).
        .conn = s.slot_conn[slot],
        .responded = s.slot_responded[slot],
    });
    s.parked_bytes += foot;
    std.debug.assert(s.parked_bytes <= s.cfg.snap_bytes);
    try emit(s, .{ .kind = .snapshot, .exec_id = s.slot_exec[slot], .module = s.slot_module[slot], .payload = snap });
    s.counters.evictions += 1;
    // The slot and region go back; only the index row stays.
    s.slot_route[slot] = 0xFFFF;
    releaseSlot(s, slot);
}

fn restore(s: *State, exec_id: u64, snap: []const u8) void {
    if (s.by_exec.get(exec_id) != null) return;
    const parked = s.parked.get(exec_id) orelse return;
    if (snap.len < @sizeOf(SnapHeader)) return;
    const h = std.mem.bytesToValue(SnapHeader, snap[0..@sizeOf(SnapHeader)]);
    if (h.magic != snap_magic or h.version != snap_version or h.exec_id != exec_id or snap.len < @sizeOf(SnapHeader) + h.len) return;
    const body = snap[@sizeOf(SnapHeader)..][0..h.len];
    if (@import("logfmt.zig").checksum(body) != h.checksum) return;
    const slot = takeSlot(s) orelse return;
    var class: u8 = 0;
    while (class < 4 and s.cfg.region_sizes[class] < h.len + h.len / 2 + 256) class += 1;
    if (class == 4) class = 3;
    const got = takeRegion(s, class) orelse {
        s.free_slots[s.nfree_slots] = slot;
        s.nfree_slots += 1;
        return;
    };
    var r = got.region;
    @memcpy(r.buf[0..h.len], body);
    r.used = h.len;
    s.regions[slot] = r;
    s.slot_class[slot] = class;
    s.slot_region_idx[slot] = got.idx;
    s.slot_module[slot] = parked.module;
    s.slot_exec[slot] = exec_id;
    s.slot_route[slot] = 0xFFFF;
    s.slot_conn[slot] = parked.conn;
    s.slot_responded[slot] = parked.responded;
    s.slot_subscribed[slot] = false;
    s.slot_long_wait[slot] = false;
    s.slot_state[slot] = .parked;
    s.by_exec.putAssumeCapacity(exec_id, slot);
    _ = s.parked.remove(exec_id);
    std.debug.assert(s.parked_bytes >= parked.bytes);
    s.parked_bytes -= parked.bytes;
    s.counters.restores += 1;
}

/// After recovery from a log: effects that were sent but have no result are
/// in doubt. Idempotent ones are sent again with the same key; the others
/// move their execution to needs-attention.
/// After a restore: send again the approval requests that were in doubt.
fn redispatchInDoubt(s: *State, exec_id: u64, scratch: *Arena) StepError!void {
    const slot = s.by_exec.get(exec_id) orelse return;
    var vm = vmFor(s, slot, scratch);
    // Effects of one execution are numbered 0..next_effect: no table scan.
    var keys: [16]EffectKey = undefined;
    var n: usize = 0;
    var seq: u32 = 0;
    const next_effect = s.regions[slot].exec().next_effect;
    while (seq < next_effect and n < keys.len) : (seq += 1) {
        const p = s.pending.get(.{ .exec_id = exec_id, .seq = seq }) orelse continue;
        if (!p.in_doubt) continue;
        keys[n] = .{ .exec_id = exec_id, .seq = seq };
        n += 1;
    }
    for (keys[0..n]) |k| {
        const p = s.pending.getPtr(k).?;
        p.in_doubt = false;
        const fi = interp.fibreForEffect(&vm, k.seq) orelse continue;
        const req = interp.pendingEffect(&vm, fi);
        const payload = try encodeJson(&vm, req.args, scratch);
        var a: Action = .{ .kind = .dispatch, .effect_kind = p.kind, .exec_id = exec_id, .seq = k.seq, .step = p.step, .module = s.slot_module[slot], .attempt = p.attempt + 1, .idempotent = true, .payload = payload, .durability = durOf(s, slot) };
        idempotencyKey(exec_id, vm.m.str(vm.m.steps[p.step].id), p.occurrence, &a.key);
        try emit(s, a);
    }
    // The execution waits for the answer again. It leaves memory when it
    // goes idle, after any result in this batch has been applied.
    if (n > 0) {
        markReady(s, slot);
        s.slot_long_wait[slot] = true;
    }
}

/// The operations of n8n services that only read (spec 9.9).
const service_reads = [_][]const u8{ "getColumns", "getManyRowsAndCount", "getManyAndCount", "getProjectId", "getProcessedDataCount" };

/// True when the args of a `service` effect name an operation that only reads.
fn serviceRead(vm: *ops.Vm, args: Value) bool {
    if (value.kindOf(args) != .object) return false;
    const op = vm.objGet(value.payload(args), "op");
    if (value.kindOf(op) != .string) return false;
    const name = vm.str(op);
    for (service_reads) |r| {
        if (std.mem.eql(u8, name, r)) return true;
    }
    return false;
}

/// The connections of the process before a recovery are gone, and a new
/// connection can have the same token: no execution from before it replies.
fn forgetConnections(s: *State) void {
    for (s.slot_state, 0..) |st, slot| {
        if (st != .free) s.slot_conn[slot] = 0;
    }
    var it = s.parked.valueIterator();
    while (it.next()) |p| p.conn = 0;
}

fn resolveInDoubt(s: *State, scratch: *Arena) StepError!void {
    var keys: [256]EffectKey = undefined;
    var n: usize = 0;
    var it = s.pending.iterator();
    while (it.next()) |kv| {
        if (n == keys.len) break;
        keys[n] = kv.key_ptr.*;
        n += 1;
    }
    std.sort.block(EffectKey, keys[0..n], {}, struct {
        fn less(_: void, a: EffectKey, b: EffectKey) bool {
            return a.exec_id < b.exec_id or (a.exec_id == b.exec_id and a.seq < b.seq);
        }
    }.less);
    for (keys[0..n]) |k| {
        const slot = s.by_exec.get(k.exec_id) orelse {
            // Evicted while waiting for a person. Ask the shell to load it;
            // the approval request goes out again when it is restored.
            // A wake is safe to repeat; an earlier recovery may have set the
            // mark already without the restore ever happening.
            const p = s.pending.getPtr(k).?;
            if (p.kind == .approval) {
                p.in_doubt = true;
                try emit(s, .{ .kind = .wake, .exec_id = k.exec_id });
            }
            continue;
        };
        if (s.regions[slot].exec().status == .needs_attention) continue;
        const pend = s.pending.get(k).?;
        var vm = vmFor(s, slot, scratch);
        const fi = interp.fibreForEffect(&vm, k.seq) orelse continue;
        const st = vm.m.steps[pend.step];
        // A service call that reads is safe to send again; a write is not
        // (spec 9.9): the backend may have done it.
        const read = pend.kind == .service and serviceRead(&vm, interp.pendingEffect(&vm, fi).args);
        if (st.idempotent != 0 or pend.kind == .approval or read) {
            const req = interp.pendingEffect(&vm, fi);
            const payload = try encodeJson(&vm, req.args, scratch);
            var a: Action = .{ .kind = .dispatch, .effect_kind = pend.kind, .exec_id = k.exec_id, .seq = k.seq, .step = pend.step, .module = s.slot_module[slot], .attempt = pend.attempt + 1, .idempotent = true, .payload = payload };
            idempotencyKey(k.exec_id, vm.m.str(st.id), pend.occurrence, &a.key);
            try emit(s, a);
        } else {
            // The row stays, so an operator retry can send the effect again.
            try needsAttention(s, slot, fi, pend.step, scratch);
        }
    }
}

// ---- invariants -------------------------------------------------------------------

/// Checked by the simulation after every batch.
pub fn checkInvariants(s: *const State) !void {
    var live: u32 = 0;
    for (s.slot_state) |st| {
        if (st != .free) live += 1;
    }
    if (live + s.nfree_slots != s.cfg.slots) return error.SlotCountMismatch;
    if (s.by_exec.count() != live) return error.ExecIndexMismatch;
    var regions_used: u32 = 0;
    for (s.pool_nfree, s.cfg.region_counts) |nf, total| regions_used += total - nf;
    if (regions_used != live) return error.RegionCountMismatch;
    // Each live slot holds a valid execution root.
    for (s.slot_state, 0..) |st, slot| {
        if (st == .free) continue;
        const e = s.regions[slot].at(heap.Exec, 0);
        if (e.magic != heap.exec_magic or e.nfibres == 0 or e.nfibres > e.fibres_cap or e.exec_id != s.slot_exec[slot]) return error.SlotWithBadExecutionRoot;
    }
    if (std.debug.runtime_safety) {
        // Each live slot holds its own pool entry, and the pool marks it as
        // held: no live execution points into a released region.
        var seen: [4]std.StaticBitSet(1 << 16) = @splat(.empty);
        for (s.slot_state, 0..) |st, slot| {
            if (st == .free) continue;
            const c = s.slot_class[slot];
            const idx = s.slot_region_idx[slot];
            if (idx >= s.pool_owned[c].len or !s.pool_owned[c][idx]) return error.LiveSlotOnReleasedRegion;
            if (idx >= 1 << 16) continue;
            if (seen[c].isSet(idx)) return error.TwoSlotsShareRegion;
            seen[c].set(idx);
        }
    }
    // A parked execution keeps its module alive.
    var pit = s.parked.valueIterator();
    var pbytes: u64 = 0;
    while (pit.next()) |p| {
        if (p.module >= s.nmodules or s.modules[p.module].state == .empty or s.modules[p.module].refs == 0) return error.ParkedOnFreedModule;
        pbytes += p.bytes;
    }
    if (pbytes != s.parked_bytes or pbytes > s.cfg.snap_bytes) return error.ParkedBytesMismatch;
    // Every pending row belongs to a live or parked execution.
    var kit = s.pending.keyIterator();
    while (kit.next()) |k| if (!s.knowsExecution(k.exec_id)) return error.PendingWithoutExecution;
    // Each execution, loaded or parked, holds its module; so does each
    // current version.
    var refs: u64 = 0;
    var current: u64 = 0;
    for (s.modules[0..s.nmodules]) |lm| {
        if (lm.state == .empty) continue;
        refs += lm.refs;
        if (lm.state == .live) current += 1;
    }
    if (refs != current + s.by_exec.count() + s.parked.count()) return error.ModuleRefMismatch;
}

test "an unchecked JSON body parses alone, or becomes its text as before" {
    const gpa = std.testing.allocator;
    const Asm = @import("asm.zig").Asm;
    var a: Asm = .{ .gpa = gpa };
    defer a.deinit();
    a.beginFunc();
    try a.emit(.ret, 0, 0, 0, 0);
    try a.endFunc("run", 1, 1, 0);
    const bytes = try a.finish();
    defer gpa.free(bytes);
    var natives: [8]u16 = undefined;
    const m = try module.load(bytes, &natives);
    const region_buf = try gpa.alignedAlloc(u8, .@"8", 1 << 20);
    defer gpa.free(region_buf);
    const scratch_buf = try gpa.alloc(u8, 1 << 20);
    defer gpa.free(scratch_buf);
    var scratch = Arena.init(scratch_buf);
    const head = "{\"status\":200,\"headers\":{\"content-type\":\"application/json\"}}";
    const bodies = [_][]const u8{
        "{\"a\":[1,2,{\"b\":null}]}",
        "  \n{\"a\":1}\t ",
        "1,\"x\":2",
        "{bad",
        "\"just a string\"",
        "[1,2] [3]",
        "not json \xff\xfe",
        "12.50",
    };
    for (bodies) |body| {
        // Today's shell: the trimmed body when it validates, else its text.
        const trimmed = std.mem.trim(u8, body, " \t\r\n");
        const valid = std.json.validate(gpa, trimmed) catch false;
        var old: std.ArrayList(u8) = .empty;
        defer old.deinit(gpa);
        try old.appendSlice(gpa, head[0 .. head.len - 1]);
        try old.appendSlice(gpa, ",\"body\":");
        if (valid) try old.appendSlice(gpa, trimmed) else {
            var sb = scratch.builder();
            try json.writeString(&sb, body);
            try old.appendSlice(gpa, sb.bytes());
            scratch.reset();
        }
        try old.append(gpa, '}');
        const raw = try std.mem.concat(gpa, u8, &.{ head, body });
        defer gpa.free(raw);

        var region = heap.Region.init(region_buf);
        var vm: ops.Vm = .{ .r = &region, .m = &m, .scratch = &scratch };
        const want = try json.decode(&vm, old.items);
        var text = false;
        const ev: Event = .{ .kind = .effect_ok, .aux = raw_body_flag | @as(u32, head.len), .payload = raw };
        const got = try resultValue(&vm, ev, "Call", &text, .{});
        try std.testing.expectEqual(!valid, text);
        var wb = scratch.builder();
        _ = try json.encode(&vm, &wb, want, "");
        const want_s = try gpa.dupe(u8, wb.bytes());
        defer gpa.free(want_s);
        var gb = scratch.builder();
        _ = try json.encode(&vm, &gb, got, "");
        try std.testing.expectEqualStrings(want_s, gb.bytes());
        // A step whose code never reads the headers: the same, with `{}`.
        var text2 = false;
        const headless = try resultValue(&vm, ev, "Call", &text2, .{ .headers = false });
        try std.testing.expectEqual(text, text2);
        const want2 = try std.mem.replaceOwned(u8, gpa, want_s, "{\"content-type\":\"application/json\"}", "{}");
        defer gpa.free(want2);
        var hb = scratch.builder();
        _ = try json.encode(&vm, &hb, headless, "");
        try std.testing.expectEqualStrings(want2, hb.bytes());
        // A step whose code reads only the status: no body member, and the
        // body is not parsed (a bad body is no error).
        var text3 = false;
        const status_only = try resultValue(&vm, ev, "Call", &text3, .{ .headers = false, .body = false });
        var sb3 = scratch.builder();
        _ = try json.encode(&vm, &sb3, status_only, "");
        try std.testing.expectEqualStrings("{\"status\":200,\"headers\":{}}", sb3.bytes());
        // The shell leaves an unread body out: an empty raw body.
        const ev_nobody: Event = .{ .kind = .effect_ok, .aux = raw_body_flag | @as(u32, head.len), .payload = head };
        const no_body = try resultValue(&vm, ev_nobody, "Call", &text3, .{ .headers = false, .body = false });
        var sb6 = scratch.builder();
        _ = try json.encode(&vm, &sb6, no_body, "");
        try std.testing.expectEqualStrings("{\"status\":200,\"headers\":{}}", sb6.bytes());
        // The same response sent as one text (not labelled JSON).
        const ev_text: Event = .{ .kind = .effect_ok, .payload = old.items };
        var text4 = false;
        const text_status = try resultValue(&vm, ev_text, "Call", &text4, .{ .headers = false, .body = false });
        var sb4 = scratch.builder();
        _ = try json.encode(&vm, &sb4, text_status, "");
        try std.testing.expectEqualStrings("{\"status\":200,\"headers\":{}}", sb4.bytes());
        // A text without a status (a host step's items) decodes whole.
        const items = try resultValue(&vm, .{ .kind = .effect_ok, .payload = "[{\"a\":1}]" }, "Call", &text4, .{ .headers = false, .body = false });
        var sb5 = scratch.builder();
        _ = try json.encode(&vm, &sb5, items, "");
        try std.testing.expectEqualStrings("[{\"a\":1}]", sb5.bytes());
        scratch.reset();
    }
}

test "decoded keys that are module strings become those constants" {
    const gpa = std.testing.allocator;
    const Asm = @import("asm.zig").Asm;
    var a: Asm = .{ .gpa = gpa };
    defer a.deinit();
    a.beginFunc();
    try a.emit(.getprop, 0, 0, 0, try a.str("status"));
    try a.emit(.ret, 0, 0, 0, 0);
    try a.endFunc("run", 1, 1, 0);
    const bytes = try a.finish();
    defer gpa.free(bytes);
    // Room for the strings, the compiled ids and the key table.
    var natives: [256]u16 = undefined;
    const m = try module.load(bytes, &natives);
    try std.testing.expect(m.keys.len > 0);
    const region_buf = try gpa.alignedAlloc(u8, .@"8", 1 << 16);
    defer gpa.free(region_buf);
    const scratch_buf = try gpa.alloc(u8, 1 << 16);
    defer gpa.free(scratch_buf);
    var scratch = Arena.init(scratch_buf);
    var region = heap.Region.init(region_buf);
    var vm: ops.Vm = .{ .r = &region, .m = &m, .scratch = &scratch };
    const src = "{\"status\":200,\"other\":{\"status\":\"x\"}}";
    const v = try json.decode(&vm, src);
    const entries = region.objEntries(value.payload(v));
    // "status" is a module string; "other" is not.
    try std.testing.expect(value.payload(entries[0]) >= value.const_handle_base);
    try std.testing.expect(value.payload(entries[2]) < value.const_handle_base);
    var b = scratch.builder();
    _ = try json.encode(&vm, &b, v, "");
    try std.testing.expectEqualStrings(src, b.bytes());
}
