/*
 * Animated CCIP-Read resolution diagram.
 *
 * In any .mdx page:
 *   import { FlowExplainer } from '/snippets/flow-explainer.jsx'
 *   <FlowExplainer />
 *
 * Boxed, looping explainer of one Universal Usernames lookup, start to finish:
 * wallet -> ENS Universal Resolver -> HybridResolverV2 reverts with
 * OffchainLookup -> Namespace gateway -> brand endpoint -> signed answer ->
 * verified callback. Motion is CSS keyframes remounted per beat, so it runs off
 * the main thread.
 *
 * The client, not the resolver, makes the gateway request. Steps 3 and 6 run
 * on arcs that go around the Ethereum group, straight between the wallet and
 * the gateway, so the diagram never implies a contract fetching anything.
 * Step 7 passes under the Universal Resolver node on its way to
 * HybridResolverV2, which is the callback route the client actually takes.
 *
 * MOTION BUDGET. Two kinds of motion live here and they follow different rules.
 *
 *  - Narrative motion — the packet crossing a wire, the beat loop. This is
 *    content: the duration IS the explanation, so it is deliberately far above
 *    the sub-300ms ceiling that governs interface feedback. Travel is `linear`,
 *    because a request in flight is progress-as-time; easing it at both ends
 *    made the request look like it hesitated before leaving and again before
 *    arriving.
 *  - Interface motion — step arrows, the pause cue, chip and caption
 *    enters. This is feedback and stays under 300ms, transform/opacity only,
 *    transitions for anything reversible and keyframes only for one-shots that
 *    always run to completion.
 *
 * Three beats-worth of timing detail, since none of it is guessable:
 *
 *  1. Each beat is travel + land + dwell, and the dwell scales with caption
 *     length. A flat beat left ~900ms of dead air after short captions and cut
 *     the long ones off mid-read.
 *  2. Beat 2 is the only beat whose path is a refusal. HybridResolverV2 does
 *     not answer; it reverts with OffchainLookup. Its packet reaches the
 *     resolver and comes straight back in the resolver's own hue instead of
 *     travelling on, because "the resolver stores no answer" is the sentence
 *     readers bounce off.
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
 *     lifted the bare <svg> into a modal, losing the caption and step arrows, and the
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
     custom.css splits fx-flow at TRAVEL / (TRAVEL + LAND). RECOIL is the whole
     fx-recoil animation, which reaches the resolver at RECOIL_ARRIVE of its
     run. Changing any of these means changing custom.css too. */
  const TRAVEL_MS = 900
  const LAND_MS = 180
  const RECOIL_MS = 900
  const RECOIL_ARRIVE = 0.45
  const SETTLE_MS = 400

  const NAME = 'happy.brand.eth'

  const [beat, setBeat] = useState(0)
  const [paused, setPaused] = useState(false)
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

  const NODES = [
    { id: 'wallet', tone: 'wallet', x: 16, y: 130, w: 112, h: 56, label: 'Wallet / App' },
    { id: 'universal', tone: 'chain', x: 184, y: 130, w: 152, h: 56, label: 'Universal Resolver', sub: 'ENS' },
    { id: 'resolver', tone: 'eth', x: 392, y: 130, w: 160, h: 56, label: 'HybridResolverV2', sub: 'brand.eth resolver' },
    { id: 'gateway', tone: 'gw', x: 624, y: 130, w: 148, h: 56, label: 'Namespace gateway', sub: 'CCIP-Read' },
    { id: 'endpoint', tone: 'api', x: 816, y: 130, w: 136, h: 56, label: 'Your endpoint', sub: 'api.brand.example' },
  ]

  /* `beat` is the step an edge carries its packet on. `chip` is the payload
     shown while that beat plays. Requests run on the upper lane (y 148) and
     answers on the lower one (y 170). */
  const EDGES = [
    {
      id: 'query',
      beat: 0,
      num: '1',
      nx: 156,
      ny: 140,
      d: 'M128,148 L180,148',
      chip: { text: `resolve("${NAME}", addr)`, x: 156, y: 76 },
    },
    {
      id: 'lookup',
      beat: 1,
      num: '2',
      kind: 'recoil',
      nx: 364,
      ny: 140,
      d: 'M336,148 L388,148',
      chip: { text: 'revert OffchainLookup(…)', x: 364, y: 76 },
    },
    {
      id: 'ccip',
      beat: 2,
      num: '3',
      nx: 110,
      ny: 36,
      d: 'M72,130 L72,60 Q72,44 88,44 L682,44 Q698,44 698,60 L698,126',
      chip: { text: 'GET /offchain-resolver/…/{data}.json', x: 400, y: 24 },
    },
    {
      id: 'fetch',
      beat: 3,
      num: '4',
      nx: 794,
      ny: 140,
      d: 'M772,148 L812,148',
      chip: { text: 'GET /ens/users/happy', x: 794, y: 76 },
    },
    {
      id: 'profile',
      beat: 4,
      num: '5',
      nx: 794,
      ny: 186,
      d: 'M816,170 L776,170',
      chip: { text: '200 · {"version":1,…}', x: 794, y: 228 },
    },
    {
      id: 'signed',
      beat: 5,
      num: '6',
      nx: 110,
      ny: 288,
      d: 'M698,186 L698,256 Q698,272 682,272 L88,272 Q72,272 72,256 L72,190',
      chip: { text: 'addr 0x1111…1111 · expires · sig', x: 400, y: 296 },
    },
    {
      id: 'callback',
      beat: 6,
      num: '7',
      nx: 156,
      ny: 186,
      d: 'M128,170 L388,170',
      chip: { text: 'resolveWithProof(…)', x: 262, y: 228 },
    },
  ]

  /* Monospace chip width, estimated from character count. */
  const CHIP_H = 19
  const chipW = (text) => text.length * 5.75 + 16

  /* `active` is source then target; the arrival ring lands on the second
     entry. Step 7 also lights the Universal Resolver it passes through. */
  const BEATS = [
    {
      active: ['wallet', 'universal'],
      caption: `A wallet asks the ENS Universal Resolver for the address of ${NAME}.`,
    },
    {
      active: ['universal', 'resolver'],
      caption:
        "brand.eth uses Namespace's HybridResolverV2. It has no stored record for happy, so it reverts with OffchainLookup.",
    },
    {
      active: ['wallet', 'gateway'],
      caption:
        "Contracts can't make HTTP calls, so the wallet's ENS library sends the lookup to the Namespace gateway itself.",
    },
    {
      active: ['gateway', 'endpoint'],
      caption: 'The gateway finds the endpoint connected to brand.eth and requests happy from it.',
    },
    {
      active: ['endpoint', 'gateway'],
      caption: "Your endpoint returns happy's profile as JSON, or 404 if there is no such user.",
    },
    {
      active: ['gateway', 'wallet'],
      caption:
        'The gateway validates the profile, encodes the address and signs it. The signature expires within 60 seconds.',
    },
    {
      active: ['wallet', 'resolver', 'universal'],
      caption:
        'The wallet passes the signed answer back. HybridResolverV2 checks the signer and expiry, then returns the address.',
    },
  ]

  const step = BEATS[beat]
  const recoil = EDGES.some((e) => e.beat === beat && e.kind === 'recoil')
  /* When the packet reaches the receiving node, and when its animation ends.
     The chip and the arrival ring key off the first, the beat clock off the
     second. */
  const arriveMs = recoil ? RECOIL_MS * RECOIL_ARRIVE : TRAVEL_MS
  const packetMs = recoil ? RECOIL_MS : TRAVEL_MS + LAND_MS
  /* Dwell scales with how much there is to read, clamped so a one-line caption
     still holds long enough to land and a long one never stalls the loop. */
  const dwellMs = Math.min(1600, Math.max(700, step.caption.length * 22))
  const beatMs = packetMs + dwellMs

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

  const isOn = (id) => step.active.includes(id)
  const arriving = step.active[1]

  return (
    <div
      className="fx"
      data-settling={settling}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      ref={setRootEl}
    >
      <div className="fx-scroll">
        <svg
          aria-label={`A wallet resolves ${NAME}. The ENS Universal Resolver calls brand.eth's resolver, HybridResolverV2, which reverts with OffchainLookup. The wallet then asks the Namespace gateway. The gateway requests happy from the brand's endpoint, signs the answer and returns it. HybridResolverV2 checks the signature and its expiry before the wallet shows the address.`}
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
              at least 8px of air around the nodes it holds. */}
          <g className="fx-group">
            <rect height="108" rx="10" width="128" x="8" y="104" />
            <text x="8" y="96">Client</text>
            <rect height="108" rx="10" width="392" x="172" y="104" />
            <text x="172" y="96">Ethereum</text>
            <rect height="108" rx="10" width="348" x="612" y="104" />
            <text x="612" y="96">Offchain</text>
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
                style={{ animationDelay: `${arriveMs * 0.55}ms` }}
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

          {/* A recoil edge carries the resolver's refusal instead of a request
              that travels on: out to the resolver and straight back, in the
              resolver's own hue. */}
          {EDGES.filter((e) => e.beat === beat).map((e) => (
            <circle
              className="fx-packet"
              data-kind={e.kind}
              key={`${beat}-${e.id}`}
              r="4.5"
              style={{ offsetPath: `path("${e.d}")` }}
            />
          ))}

          {NODES.map((n) => (
            <g
              className="fx-node"
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
              style={{ animationDelay: `${arriveMs}ms` }}
              width={n.w}
              x={n.x}
              y={n.y}
            />
          ))}
        </svg>
      </div>

      <div className="fx-footer">
        <p className="fx-caption" data-manual={manual} key={beat}>
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
