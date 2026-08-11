/*
 * Drop-in Mintlify snippet: animated CCIP-Read walkthrough.
 *
 *   snippets/resolve-flow.jsx
 *
 * In any .mdx page:
 *   import { ResolveFlow } from '/snippets/resolve-flow.jsx'
 *   <ResolveFlow />
 *
 * Mintlify pre-injects the React hooks, so there is no `React` global and no
 * import line here. Named export only — `export default` is not supported.
 *
 * Everything lives INSIDE the exported function on purpose. Mintlify compiles
 * snippets through MDX and splices only the exported component into the page
 * module; module-level consts and helper components are dropped. Hoisting the
 * data back out reintroduces two failures — the consts become ReferenceErrors,
 * and helpers like <Station> get rewritten to MDX component lookups that throw
 * "Expected component `Station` to be defined".
 *
 * Self-contained on purpose — no CSS modules, no imports, no design tokens from
 * the demo app. Colors are local vars that flip on Mintlify's `.dark` html class.
 * Every hex string is the real payload, captured against mainnet resolver
 * 0x7974AF8BD3AEe4fe9f8833361fBc3249E3b23aB3 and the live gateway.
 *
 * Styles live in /custom.css (Mintlify strips <style> tags injected from
 * snippets). The .rf-* class names here mirror that file.
 */


export const ResolveFlow = () => {
  const STEP_MS = 2600

  const NODE = '0x3820982270fd083d47a8da89b674476c9159e2c2f390efd09747cfcbb1c7d972'
  const RESOLVER = '0x7974AF8BD3AEe4fe9f8833361fBc3249E3b23aB3'
  const GATEWAY = 'https://suins-ens-gateway.happys1ngh.workers.dev'
  const SUI_ADDR = '0x556a3c6c150709c0a8486e3eb002ea8118ba79bdf349e710dc3bb85901f797c3'

  const STEPS = [
    {
      tag: 'Call',
      title: 'Client calls resolve("happysingh.onsui.eth")',
      blurb:
        'viem walks the ENS registry, finds SUINSResolver, and calls it with the DNS-encoded name plus the record it actually wants — addr(node, 784), SUI’s SLIP-44 coin type.',
      active: ['client', 'resolver'],
      links: { l1: 'forward' },
      panelTitle: 'eth_call → SUINSResolver.resolve(bytes,bytes)',
      lines: [
        { label: 'name', value: '0x0a686170707973696e6768056f6e7375690365746800' },
        { label: '', value: '// DNS wire: \\x0a"happysingh" \\x05"onsui" \\x03"eth" \\x00', soft: true },
        { label: 'node', value: NODE },
        { label: 'data', value: '0xf1cb7e06 addr(bytes32,uint256)' },
        { label: 'coinType', value: '784   // SUI' },
      ],
    },
    {
      tag: 'Revert',
      title: 'The contract reverts on purpose',
      blurb:
        'No data comes back. SUINSResolver throws OffchainLookup — EIP-3668’s handshake. To a normal client this is a failed call; to a CCIP-Read client it is an instruction: go ask this URL, then call me back here.',
      active: ['resolver', 'client'],
      links: { l1: 'reverse' },
      badge: { text: 'revert ≠ error', tone: 'warn' },
      panelTitle: 'revert OffchainLookup(address,string[],bytes,bytes4,bytes)',
      lines: [
        { label: 'sender', value: RESOLVER },
        { label: 'urls[0]', value: `${GATEWAY}/lookup/{sender}/{data}.json` },
        { label: 'callData', value: '0x9061b923… resolve(name, data)' },
        { label: 'callback', value: '0x… resolveWithProof(bytes,bytes)' },
        { label: 'extraData', value: 'abi.encode(callData, address(this))' },
      ],
    },
    {
      tag: 'Fetch',
      title: 'Client re-requests, off Ethereum entirely',
      blurb:
        'The client substitutes {sender} and {data} into the URL template and issues a plain HTTPS GET. No gas, no block, no L1 state.',
      active: ['client', 'gateway'],
      links: { l1: 'forward', l2: 'forward' },
      panelTitle: 'GET · Cloudflare Worker',
      lines: [
        { label: '', value: `${GATEWAY}/lookup/`, soft: true },
        { label: '{sender}', value: RESOLVER },
        { label: '{data}', value: '0x9061b9230000…0310000000….json' },
      ],
    },
    {
      tag: 'Rewrite',
      title: 'Worker maps the ENS name back to a Sui name',
      blurb:
        'The Worker decodes the calldata, reads the DNS-encoded name, strips the parent, and re-suffixes. This one line of string surgery is the whole bridge between the two namespaces.',
      active: ['gateway'],
      links: {},
      pulse: 'gateway',
      panelTitle: 'gateway/src/suins.ts',
      lines: [
        { label: 'in', value: 'happysingh.onsui.eth' },
        { label: 'strip', value: '.onsui.eth', soft: true },
        { label: 'suffix', value: '.sui', soft: true },
        { label: 'out', value: 'happysingh.sui' },
      ],
    },
    {
      tag: 'Fan out',
      title: 'Two sources, queried in parallel',
      blurb:
        'SuiNS on Sui mainnet is the source of truth for Sui-native fields. Namespace holds whatever the name holder layered on top — other-chain addresses, arbitrary text. Both requests go out at once.',
      active: ['gateway', 'suins', 'namespace'],
      links: { l3: 'forward' },
      panelTitle: 'Promise.all — SuiNS · Namespace',
      lines: [
        { label: 'suins', value: `targetAddress  ${SUI_ADDR}` },
        { label: '', value: 'contentHash    bafybeiduzhsil3avfyxuy54pl4hpe7liq7yzft24d3dkigbeol7quwrk7u', soft: true },
        { label: 'namespace', value: 'texts, addr(60), addr(8453) → coinType 0x80000000 | chainId' },
      ],
    },
    {
      tag: 'Merge',
      title: 'Fixed precedence, then sign',
      blurb:
        'One value wins per field under a policy the name holder cannot bend: addr(784) is SuiNS-only, so nobody can point your Sui address somewhere else offchain. Then the Worker signs the result with its key.',
      active: ['gateway'],
      links: {},
      pulse: 'gateway',
      badge: { text: 'signed', tone: 'ok' },
      panelTitle: 'precedence.ts → sign(sender, expires, calldata, result)',
      lines: [
        { label: 'addr(784)', value: 'SuiNS only — cannot be overridden' },
        { label: 'contenthash', value: 'SuiNS, falls back to Namespace' },
        { label: 'text(*)', value: 'Namespace' },
        { label: 'expires', value: '0x6a70f6d8' },
        { label: 'signature', value: '0x13f6ac53c5211140db9c8a29564d24ad2c3d70b65ac471a1d…1c' },
      ],
    },
    {
      tag: 'Verify',
      title: 'resolveWithProof() checks the signature onchain',
      blurb:
        'The client hands the signed blob back to the contract it started at. ECDSA recovers the signer; if it is not a trusted signer the call reverts. Only then does resolve() return a value.',
      active: ['gateway', 'resolver', 'client'],
      links: { l2: 'reverse', l1: 'reverse' },
      badge: { text: 'verified', tone: 'ok' },
      panelTitle: 'happysingh.onsui.eth resolved',
      lines: [
        { label: 'addr(784)', value: SUI_ADDR },
        { label: 'contenthash', value: 'ipfs://bafybeiduzhsil3avfyxuy54pl4hpe7liq7yzft24d3dkigbeol7quwrk7u' },
        { label: 'org.suins.name', value: 'happysingh.sui' },
      ],
    },
  ]

  const STATIONS = {
    client: { name: 'Client', sub: 'viem · .limo', chain: 'offchain' },
    resolver: { name: 'SUINSResolver', sub: '0x7974…3aB3', chain: 'Ethereum' },
    gateway: { name: 'Gateway', sub: 'workers.dev', chain: 'Cloudflare' },
    suins: { name: 'SuiNS', sub: 'name registry', chain: 'Sui mainnet' },
    namespace: { name: 'Namespace', sub: 'offchain records', chain: 'offchain' },
  }


  const Station = ({ id, state }) => {
    const meta = STATIONS[id]
    return (  
      <div className="rf-st" data-state={state}>
        <span className="rf-chain">{meta.chain}</span>
        <span className="rf-name">{meta.name}</span>
        <span className="rf-sub">{meta.sub}</span>
      </div>
    )
  }

  /* `reverse` mirrors the wire on X, so packet and trail both run backwards from
     one flip. Remounted per step (via key) to restart the keyframes. */
  const Wire = ({ flow, rows = 1 }) => {
    return (
      <div className="rf-link" data-flow={flow || 'idle'}>
        {Array.from({ length: rows }, (_, i) => (
          <span className="rf-wire" key={i}>
            <span className="rf-packet" />
          </span>
        ))}
      </div>
    )
  }

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    if (!playing) return
    const id = setTimeout(() => setIndex((i) => (i + 1) % STEPS.length), STEP_MS)
    return () => clearTimeout(id)
  }, [index, playing])

  const go = (next) => {
    setPlaying(false)
    setIndex(((next % STEPS.length) + STEPS.length) % STEPS.length)
  }

  const step = STEPS[index]
  const stateOf = (id) =>
    step.pulse === id ? 'pulse' : step.active.includes(id) ? 'on' : 'off'

  return (
    <div
      aria-label="How a name resolves"
      className="rf"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1)
        else if (e.key === 'ArrowLeft') go(index - 1)
        else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
      }}
      tabIndex={0}
    >
      <div className="rf-head">
        happysingh<span className="rf-dim">.onsui.eth</span>
        <span className="rf-arrow">&rarr;</span>
        happysingh<span className="rf-dim">.sui</span>
      </div>

      <div className="rf-stage">
        <Station id="client" state={stateOf('client')} />
        <Wire flow={step.links.l1} key={`l1-${index}`} />
        <Station id="resolver" state={stateOf('resolver')} />
        <Wire flow={step.links.l2} key={`l2-${index}`} />
        <Station id="gateway" state={stateOf('gateway')} />
        <Wire flow={step.links.l3} key={`l3-${index}`} rows={2} />
        <div className="rf-split">
          <Station id="suins" state={stateOf('suins')} />
          <Station id="namespace" state={stateOf('namespace')} />
        </div>
      </div>

      <div className="rf-rail" role="tablist">
        {STEPS.map((s, i) => (
          <button
            aria-selected={i === index}
            className="rf-tab"
            data-state={i === index ? 'on' : i < index ? 'past' : 'off'}
            key={s.tag}
            onClick={() => go(i)}
            role="tab"
            type="button"
          >
            <span className="rf-bar" />
            {i + 1} &middot; {s.tag}
          </button>
        ))}
      </div>

      <div>
        <h4 className="rf-title">
          {step.title}
          {step.badge ? (
            <span className="rf-badge" data-tone={step.badge.tone}>{step.badge.text}</span>
          ) : null}
        </h4>
        <p className="rf-blurb">{step.blurb}</p>
      </div>

      <div className="rf-payload" key={index}>
        <p className="rf-ptitle">{step.panelTitle}</p>
        <dl className="rf-lines">
          {step.lines.map((line, i) => (
            <div className="rf-line" data-soft={line.soft ? 'true' : undefined} key={i}>
              <dt>{line.label}</dt>
              <dd>{line.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rf-ctls">
        <button className="rf-btn" onClick={() => go(index - 1)} type="button">&larr; Prev</button>
        <button className="rf-btn" data-primary onClick={() => setPlaying((p) => !p)} type="button">
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="rf-btn" onClick={() => go(index + 1)} type="button">Next &rarr;</button>
      </div>
    </div>
  )
}
