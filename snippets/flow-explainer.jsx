/*
 * Animated CCIP-Read resolution diagram.
 *
 * In any .mdx page:
 *   import { FlowExplainer } from '/snippets/flow-explainer.jsx'
 *   <FlowExplainer />
 *
 * Boxed, looping explainer of one lookup, laid out to match the protocol
 * diagram: wallet -> ENS resolver -> gateway -> records -> signed response ->
 * wallet. Motion is CSS keyframes remounted per beat, so it runs off the main
 * thread.
 *
 * Two toggles, and neither one changes the path:
 *
 *  - Parent name. A `.eth` name and a DNS domain imported into ENS resolve
 *    identically, so only the string being resolved moves.
 *  - Records. Step 3 reads from ONE store, never both. On-chain means an RPC
 *    call to a registry contract; off-chain means an HTTPS call to a system you
 *    already run. Nothing is fanned out and nothing is merged — the unselected
 *    store stays on the canvas, muted, so the choice is visible without drawing
 *    a path nobody takes.
 *
 * MOTION BUDGET. Two kinds of motion live here and they follow different rules.
 *
 *  - Narrative motion — the packet crossing a wire, the beat loop. This is
 *    content: the duration IS the explanation, so it is deliberately far above
 *    the sub-300ms ceiling that governs interface feedback. Travel is `linear`,
 *    because a request in flight is progress-as-time; easing it at both ends
 *    made the request look like it hesitated before leaving and again before
 *    arriving.
 *  - Interface motion — toggles, step arrows, the pause cue, chip and caption
 *    enters. This is feedback and stays under 300ms, transform/opacity only,
 *    transitions for anything reversible and keyframes only for one-shots that
 *    always run to completion.
 *
 * Three beats-worth of timing detail, since none of it is guessable:
 *
 *  1. Each beat is travel + land + dwell, and the dwell scales with caption
 *     length. A flat beat left ~900ms of dead air after short captions and cut
 *     the long ones off mid-read.
 *  2. Beat 2 is the only beat whose path is a rejection — the resolver does not
 *     answer, it reverts with a gateway URL. It gets a recoil in the resolver's
 *     own hue before the real request runs, because "the resolver stores no
 *     answer" is the sentence readers bounce off.
 *  3. Traversed edges hold at a dim accent instead of resetting, then wipe
 *     together at the loop boundary, so one full lookup is visible as a unit.
 *
 * Platform constraints, all forced by Mintlify:
 *
 *  1. Everything lives INSIDE the exported function. Mintlify compiles snippets
 *     through MDX and splices only the exported component into the page module,
 *     dropping module-level consts and helper components. Hoisting NODES/EDGES/
 *     BEATS back out turns them into ReferenceErrors at render.
 *  2. No types — the MDX pipeline parses JSX, not TSX.
 *  3. CSS modules are unavailable, so the styles live as `.fx-*` classes in
 *     /custom.css. Any .css file in the content dir is auto-loaded site-wide.
 *  4. Named export only; hooks are pre-injected, so there is no import line and
 *     no `React` global. Only useState and useEffect are relied on — the
 *     element handle for the viewport observer is a callback ref held in state
 *     rather than useRef, which is not guaranteed to be injected.
 *  5. Plain <div>s, never <figure>. Mintlify wraps a <figure> in
 *     react-medium-image-zoom, which forced two bugs: clicking the diagram
 *     lifted the bare <svg> into a modal, losing the caption and dots, and the
 *     zoom wrapper is a shrink-to-fit <span> that inherited the svg's min-width
 *     and pushed the whole page into horizontal scroll on mobile. The <svg>
 *     keeps role="img" and its aria-label, which is what actually carries the
 *     diagram to a screen reader.
 *
 * The palette follows the page theme. Light values sit on `.fx` and the dark
 * ones override them under Mintlify's `.dark` class, matching how the older
 * `.rf` diagram switches. Every rule reads a token, so nothing in here knows
 * which theme is on.
 */

export const FlowExplainer = () => {
  /* Narrative timing. TRAVEL and LAND together are one packet animation;
     custom.css splits fx-flow at TRAVEL / (TRAVEL + LAND). Changing either
     number here means changing that split too. */
  const TRAVEL_MS = 900
  const LAND_MS = 180
  const RECOIL_MS = 560
  const SETTLE_MS = 400

  const ROUTES = [
    {
      id: 'ens',
      label: '.eth name',
      name: 'happy.brand.eth',
      note: 'brand.eth registered in ENS',
    },
    {
      id: 'dns',
      label: 'DNS name',
      name: 'happy.brand.id',
      note: 'brand.id imported into ENS with DNSSEC',
    },
  ]

  /* Geometry lives on the store: step 3 draws one path out and step 4 draws
     one path back, to whichever store is selected. */
  const STORES = [
    {
      id: 'onchain',
      label: 'Onchain',
      node: 'chain',
      note: 'one RPC call to your registry contract',
      lookup: 'The gateway makes one RPC call and reads the record from your registry contract.',
      back: 'The contract returns the record. Nothing else is queried.',
      out: {
        d: 'M662,144 C700,140 712,73 750,73',
        nx: 706,
        ny: 100,
        chip: { text: 'eth_call · recordOf(node)', x: 590, y: 112 },
      },
      ret: {
        d: 'M750,92 C712,92 700,160 664,164',
        nx: 718,
        ny: 134,
        /* Response lands in the same slot the request left from. */
        chip: { text: 'addr(60) 0x1a9C…4b2f · avatar', x: 600, y: 112 },
      },
    },
    {
      id: 'offchain',
      label: 'Offchain',
      node: 'api',
      note: 'one HTTPS request to your API',
      lookup: 'The gateway makes one HTTPS request and reads the record from the system you already run.',
      back: 'Your API returns the record. Nothing else is queried.',
      out: {
        d: 'M662,172 C700,176 712,243 750,243',
        nx: 706,
        ny: 218,
        chip: { text: 'GET /records/happy', x: 590, y: 206 },
      },
      ret: {
        d: 'M750,224 C712,224 700,180 664,176',
        nx: 718,
        ny: 196,
        chip: { text: 'addr(60) 0x1a9C…4b2f · avatar', x: 600, y: 206 },
      },
    },
  ]

  const [beat, setBeat] = useState(0)
  const [paused, setPaused] = useState(false)
  const [routeId, setRouteId] = useState('ens')
  const [storeId, setStoreId] = useState('onchain')
  /* True while the reader stepped here themselves. A deliberate step gets no
     caption fade — someone clicking through at their own pace is fighting a
     260ms cross-fade on every press. */
  const [manual, setManual] = useState(false)
  /* The 400ms at the end of the loop where the traversed trail wipes. */
  const [settling, setSettling] = useState(false)
  const [reduce, setReduce] = useState(false)
  /* Nothing autoplays until the card is actually on screen: a loop that starts
     at mount is animating page-load resting state, and burns frames above the
     fold where nobody is looking. */
  const [visible, setVisible] = useState(false)
  const [rootEl, setRootEl] = useState(null)

  const route = ROUTES.find((r) => r.id === routeId)
  const store = STORES.find((s) => s.id === storeId)
  const NAME = route.name

  const NODES = [
    { id: 'wallet', tone: 'wallet', x: 24, y: 130, w: 116, h: 56, label: 'Wallet / App' },
    { id: 'resolver', tone: 'eth', x: 250, y: 130, w: 160, h: 56, label: 'ENS Resolver', sub: 'CCIP-Read' },
    { id: 'gateway', tone: 'gw', x: 526, y: 130, w: 136, h: 56, label: 'CCIP Gateway' },
    { id: 'chain', tone: 'chain', x: 754, y: 46, w: 176, h: 54, label: 'Onchain records', sub: 'your registry contract' },
    { id: 'api', tone: 'api', x: 754, y: 216, w: 176, h: 54, label: 'Offchain records', sub: 'your API or database' },
  ]

  /* `beat` is the step an edge carries its packet on. `chip` is the payload
     shown while that beat plays. */
  const EDGES = [
    {
      id: 'query',
      beat: 0,
      num: '1',
      nx: 193,
      ny: 140,
      d: 'M140,148 L246,148',
      chip: { text: `resolve("${NAME}")`, x: 193, y: 66 },
    },
    {
      id: 'ccip',
      beat: 1,
      num: '2',
      nx: 466,
      ny: 140,
      d: 'M410,148 L522,148',
      chip: { text: 'GET /lookup/{sender}/{data}.json', x: 466, y: 84 },
    },
    { id: 'lookup', beat: 2, num: '3', ...store.out },
    { id: 'return', beat: 3, num: '4', ...store.ret },
    {
      id: 'signed',
      beat: 4,
      num: '5',
      nx: 466,
      ny: 186,
      d: 'M522,170 L412,170',
      chip: { text: '200 OK · sig 0x1c8f…9d02', x: 466, y: 216 },
    },
    {
      id: 'records',
      beat: 5,
      num: '6',
      nx: 194,
      ny: 186,
      d: 'M246,170 L142,170',
      chip: { text: 'addr(60) 0x1a9C…4b2f', x: 194, y: 216 },
    },
  ]

  /* Monospace chip width, estimated from character count. */
  const CHIP_H = 19
  const chipW = (text) => text.length * 5.75 + 16

  const BEATS = [
    {
      active: ['wallet', 'resolver'],
      caption: `A wallet asks Ethereum to resolve ${NAME}.`,
    },
    {
      active: ['resolver', 'gateway'],
      caption:
        'The resolver stores no answer. It reverts with a gateway URL — that is CCIP-Read.',
    },
    {
      active: ['gateway', store.node],
      caption: store.lookup,
    },
    {
      active: [store.node, 'gateway'],
      caption: store.back,
    },
    {
      active: ['gateway', 'resolver'],
      caption: 'The gateway signs the response so nothing can be swapped in transit.',
    },
    {
      active: ['resolver', 'wallet'],
      caption:
        'The resolver verifies that signature on Ethereum, and the wallet gets its records.',
    },
  ]

  const step = BEATS[beat]
  /* Beat 2 spends RECOIL_MS bouncing off the resolver before the real request
     leaves, so everything timed off the packet shifts by the same lead. */
  const lead = beat === 1 ? RECOIL_MS : 0
  /* Dwell scales with how much there is to read, clamped so a one-line caption
     still holds long enough to land and a long one never stalls the loop. */
  const dwellMs = Math.min(1600, Math.max(700, step.caption.length * 22))
  const beatMs = lead + TRAVEL_MS + LAND_MS + dwellMs

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduce(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!rootEl || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 },
    )
    io.observe(rootEl)
    return () => io.disconnect()
  }, [rootEl])

  /* Fail open. MDX compiles every tag through its own component table, so the
     callback ref above is not guaranteed to reach a DOM node — and a diagram
     that silently never plays is far worse than one that plays off screen.
     Refs attach before effects flush, so a null here means forwarding really
     did fail rather than that we looked too early. */
  useEffect(() => {
    if (rootEl && typeof IntersectionObserver !== 'undefined') return
    setVisible(true)
  }, [rootEl])

  /* Keyed on `beat` as well as `paused`, so stepping with the arrows restarts
     the clock instead of leaving a half-spent interval to fire under the
     reader — the whole point of a manual step is getting a full beat to look.
     Under reduced motion nothing advances on its own at all: hiding the packet
     but leaving the timer running is the worst of both, mutating the caption
     under the reader with the cue that explained it removed. The arrows are
     then the only control, which is what they are there for. */
  useEffect(() => {
    if (paused || reduce || !visible) return
    const last = beat === BEATS.length - 1
    const wipe = setTimeout(() => {
      if (last) setSettling(true)
    }, beatMs)
    const next = setTimeout(() => {
      setSettling(false)
      setManual(false)
      setBeat((b) => (b + 1) % BEATS.length)
    }, beatMs + (last ? SETTLE_MS : 0))
    return () => {
      clearTimeout(wipe)
      clearTimeout(next)
    }
  }, [paused, beat, reduce, visible, beatMs])

  const go = (delta) => {
    setManual(true)
    setSettling(false)
    setBeat((b) => (b + delta + BEATS.length) % BEATS.length)
  }

  /* A toggle changes what is being asked for, so the run restarts. Flipping
     store at beat 4 otherwise left a payload on screen for a request that was
     never made. */
  const retarget = (fn) => (value) => {
    fn(value)
    setManual(true)
    setSettling(false)
    setBeat(0)
  }

  const isOn = (id) => step.active.includes(id)
  /* Source then target, in every beat — the ring lands on the receiver. */
  const arriving = step.active[1]

  return (
    <div
      className="fx"
      data-settling={settling}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      ref={setRootEl}
    >
      <div className="fx-controls">
        <div aria-label="Parent name" className="fx-toggle" role="group">
          <span className="fx-toggle-label">Parent name</span>
          <div className="fx-toggle-row">
            {ROUTES.map((r) => (
              <button
                aria-pressed={r.id === routeId}
                className="fx-btn"
                data-on={r.id === routeId}
                key={r.id}
                onClick={() => retarget(setRouteId)(r.id)}
                type="button"
              >
                {r.label}
              </button>
            ))}
          </div>
          <span className="fx-toggle-note">{route.note}</span>
        </div>
        <div aria-label="Where the records live" className="fx-toggle" data-align="end" role="group">
          <span className="fx-toggle-label">Records</span>
          <div className="fx-toggle-row">
            {STORES.map((s) => (
              <button
                aria-pressed={s.id === storeId}
                className="fx-btn"
                data-on={s.id === storeId}
                key={s.id}
                onClick={() => retarget(setStoreId)(s.id)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="fx-toggle-note">{store.note}</span>
        </div>
      </div>

      <div className="fx-scroll">
        <svg
          aria-label={`A wallet resolves ${NAME}. The ENS resolver reverts with a gateway URL, the gateway reads the record from ${storeId === 'onchain' ? 'a registry contract on chain' : 'your own API'}, signs the response, and the resolver returns the record to the wallet.`}
          className="fx-svg"
          role="img"
          viewBox="0 0 964 316"
        >
          <defs>
            <marker id="fx-head" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3">
              <path className="fx-arrow" d="M0,0 L6,3 L0,6 Z" />
            </marker>
            <marker id="fx-head-on" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3">
              <path className="fx-arrow-on" d="M0,0 L6,3 L0,6 Z" />
            </marker>
            <marker id="fx-head-done" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3">
              <path className="fx-arrow-done" d="M0,0 L6,3 L0,6 Z" />
            </marker>
          </defs>

          {/* Every group label sits 8px above its own box, and every box keeps
              26px of air around what it holds. */}
          <g className="fx-group">
            <rect height="108" rx="10" width="148" x="8" y="104" />
            <text x="8" y="96">Client interface</text>
            <rect height="108" rx="10" width="188" x="236" y="104" />
            <text x="236" y="96">Naming layer</text>
            <rect height="284" rx="14" width="456" x="500" y="16" />
            <text x="500" y="8">Resolution infrastructure</text>
          </g>

          {EDGES.map((e) => {
            const on = e.beat === beat
            const done = !on && e.beat < beat
            return (
              <path
                className="fx-edge"
                d={e.d}
                data-done={done}
                data-on={on}
                key={e.id}
                markerEnd={on ? 'url(#fx-head-on)' : done ? 'url(#fx-head-done)' : 'url(#fx-head)'}
              />
            )
          })}

          {EDGES.filter((e) => e.num).map((e) => (
            <text
              className="fx-edge-num"
              data-done={e.beat < beat}
              data-on={e.beat === beat}
              key={`n-${e.id}`}
              x={e.nx}
              y={e.ny}
            >
              {e.num}
            </text>
          ))}

          {EDGES.filter((e) => e.beat === beat && e.chip).map((e) => {
            const w = chipW(e.chip.text)
            return (
              <g
                className="fx-chip"
                key={`${beat}-c-${e.id}`}
                /* Lands with the packet rather than ahead of it: the payload
                   label used to appear before the request had left. */
                style={{ animationDelay: `${lead + TRAVEL_MS * 0.55}ms` }}
              >
                <rect
                  height={CHIP_H}
                  rx="6"
                  width={w}
                  x={e.chip.x - w / 2}
                  y={e.chip.y - CHIP_H / 2}
                />
                <text x={e.chip.x} y={e.chip.y + 3.5}>{e.chip.text}</text>
              </g>
            )
          })}

          {/* The resolver's refusal, in the resolver's own hue: out a quarter of
              the way and straight back, before the real request runs. */}
          {EDGES.filter((e) => e.beat === beat && beat === 1).map((e) => (
            <circle
              className="fx-packet"
              data-kind="recoil"
              key={`${beat}-r-${e.id}`}
              r="4.5"
              style={{ offsetPath: `path("${e.d}")` }}
            />
          ))}

          {EDGES.filter((e) => e.beat === beat).map((e) => (
            <circle
              className="fx-packet"
              key={`${beat}-${e.id}`}
              r="4.5"
              style={{ offsetPath: `path("${e.d}")`, animationDelay: `${lead}ms` }}
            />
          ))}

          {NODES.map((n) => (
            <g
              className="fx-node"
              data-muted={n.id === 'chain' || n.id === 'api' ? n.id !== store.node : undefined}
              data-on={isOn(n.id)}
              data-tone={n.tone}
              key={n.id}
            >
              <rect height={n.h} rx="12" width={n.w} x={n.x} y={n.y} />
              <text
                className="fx-node-label"
                x={n.x + n.w / 2}
                y={n.y + (n.sub ? n.h / 2 - 2 : n.h / 2 + 5)}
              >
                {n.label}
              </text>
              {n.sub ? (
                <text className="fx-node-sub" x={n.x + n.w / 2} y={n.y + n.h / 2 + 14}>
                  {n.sub}
                </text>
              ) : null}
            </g>
          ))}

          {/* Arrival ring. A sibling one-shot rather than an animation on the
              node itself, which would clobber the transform and colour
              transitions data-on is already driving. */}
          {NODES.filter((n) => n.id === arriving).map((n) => (
            <rect
              className="fx-land"
              data-tone={n.tone}
              height={n.h}
              key={`${beat}-l-${n.id}`}
              rx="12"
              style={{ animationDelay: `${lead + TRAVEL_MS}ms` }}
              width={n.w}
              x={n.x}
              y={n.y}
            />
          ))}
        </svg>
      </div>

      <div className="fx-footer">
        <p className="fx-caption" data-manual={manual} key={`${routeId}-${storeId}-${beat}`}>
          <span className="fx-step">{beat + 1}</span>
          {step.caption}
        </p>
        <div className="fx-nav">
          <span aria-hidden="true" className="fx-pause" data-on={paused && !reduce}>
            ❙❙
          </span>
          <button
            aria-label="Previous step"
            className="fx-navbtn"
            onClick={() => go(-1)}
            type="button"
          >
            &larr;
          </button>
          <span className="fx-count">
            {beat + 1} / {BEATS.length}
          </span>
          <button aria-label="Next step" className="fx-navbtn" onClick={() => go(1)} type="button">
            &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
