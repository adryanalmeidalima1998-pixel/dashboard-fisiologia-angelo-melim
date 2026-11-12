import { OWNER } from '@/lib/seasons.mjs'

const SYMBOL = '/brand/athraven-symbol-transparent.webp'
const WORDMARK = '/brand/athraven-horizontal-transparent.webp'

export default function AthravenBrand({ className = '', license = false, compact = false, sidebar = false, dark = false, report = false, badge = false }) {
  const title = `ATHRAVEN Performance · Licenciado a ${OWNER.name}`
  if (badge) return <div className={`athraven-attribution ${className}`} title={title}>
    <div className="athraven-powered-badge"><span>Powered by</span><img src={WORDMARK} alt="ATHRAVEN" width={600} height={131} /></div>
    {license && <small>Licenciado a {OWNER.name}</small>}
  </div>
  const classes = ['athraven-signature', compact && 'athraven-signature--compact', sidebar && 'athraven-signature--sidebar', dark && 'athraven-signature--dark', report && 'athraven-signature--report', className].filter(Boolean).join(' ')
  return (
    <div className={classes} title={title}>
      <img className="athraven-signature__symbol" src={SYMBOL} alt={compact ? 'ATHRAVEN' : ''} width={220} height={150} />
      {!compact && <span className="athraven-signature__copy">
        <span>{sidebar ? '' : 'Powered by '}<strong>ATHRAVEN</strong></span>
        {license && <small>Licenciado a {OWNER.name}</small>}
      </span>}
    </div>
  )
}
