import { OWNER } from '@/lib/seasons.mjs'

/** Software attribution; the professional and club identities remain separate. */
export default function AthravenBrand({ className = '', license = false, compact = false, sidebar = false, dark = false, report = false }) {
  const classes = ['athraven-signature', compact && 'athraven-signature--compact', sidebar && 'athraven-signature--sidebar', dark && 'athraven-signature--dark', report && 'athraven-signature--report', className].filter(Boolean).join(' ')
  return (
    <div className={classes} title={`ATHRAVEN Performance · Licenciado a ${OWNER.name}`}>
      <span className="athraven-signature__tile">
        <img src={sidebar || compact ? '/brand/athraven-symbol.webp' : '/brand/athraven-dark.webp'} alt={compact ? 'ATHRAVEN' : ''} width={sidebar || compact ? 160 : 336} height={sidebar || compact ? 111 : 201} />
      </span>
      {!compact && <span className="athraven-signature__copy">
        <span>{sidebar ? '' : 'Powered by '}<strong>ATHRAVEN</strong></span>
        {license && <small>Licenciado a {OWNER.name}</small>}
      </span>}
    </div>
  )
}
