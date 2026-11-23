'use client'
import {useState} from 'react'
import {useSeason} from '@/app/context/SeasonContext'
import {profileFormValues,changedProfileFields,profileAge} from '@/lib/athlete-profile.mjs'
const POSICOES = ['GK', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'CA', 'ATA', 'EXT']
export default function AthleteRegistrationModal({ athlete, onClose, onSave }) {
  const { apiFetch } = useSeason()

  const [form, setForm] = useState({name: athlete?.name || '', position: athlete?.position || '',...profileFormValues(athlete||{})})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.name.trim() || !form.position) { setError('Informe o nome e a posição do atleta.'); return }
    setSaving(true)
    setError('')
    try {
      const url = athlete?.id ? `/api/athletes/${athlete.id}` : '/api/athletes'
      const method = athlete?.id ? 'PUT' : 'POST'
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({name:form.name.trim(),position:form.position,...(athlete?.id?changedProfileFields(form,athlete):{})}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao salvar.'); return }
      onSave(data.athlete)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-amber-400 bg-white"
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-slate-500"

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="athlete-modal-title" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 id="athlete-modal-title" className="text-lg font-black uppercase tracking-tight">
            {athlete?.id ? 'Editar Atleta' : 'Novo Atleta'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls} htmlFor="registration-name">Nome do atleta *</label>
              <input id="registration-name" className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} maxLength={255} placeholder="Nome utilizado no elenco, GPS e bem-estar" />
            </div>
            <div className="col-span-2">
              <label className={labelCls} htmlFor="registration-position">Posição *</label>
              <select id="registration-position" className={inputCls} value={form.position} onChange={e => set('position', e.target.value)}>
                <option value="">Selecionar</option>
                {POSICOES.map(p => <option key={p} value={p}>{({GK:'Goleiro',ZAG:'Zagueiro',LD:'Lateral direito',LE:'Lateral esquerdo',VOL:'Meio-campista defensivo',MC:'Meio-campista',MEI:'Meio-campista ofensivo',PD:'Ponta direita',PE:'Ponta esquerda',CA:'Centroavante',ATA:'Atacante',EXT:'Extremo'})[p]}</option>)}
              </select>
            </div>
            {athlete?.id ? <>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls} htmlFor="registration-birth-date">Data de nascimento</label>
                <input id="registration-birth-date" type="date" max={new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date())} className={inputCls} value={form.birth_date} onChange={e=>set('birth_date',e.target.value)}/>
                <p className="text-xs text-slate-500 mt-1">{form.birth_date&&profileAge(form.birth_date)!=null?`Idade atual: ${profileAge(form.birth_date)} anos.`:'A idade é calculada automaticamente.'}</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls} htmlFor="registration-weight">Peso (kg)</label>
                <input id="registration-weight" inputMode="decimal" className={inputCls} value={form.weight_kg} onChange={e=>set('weight_kg',e.target.value)} placeholder="Ex.: 78,5"/>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls} htmlFor="registration-height">Altura (cm)</label>
                <input id="registration-height" type="number" min="100" max="250" step="1" className={inputCls} value={form.height_cm} onChange={e=>set('height_cm',e.target.value)} placeholder="Ex.: 181"/>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={labelCls} htmlFor="registration-city">Cidade / estado</label>
                <input id="registration-city" className={inputCls} maxLength={255} value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Ex.: Campos dos Goytacazes / RJ"/>
              </div>
              <p className="col-span-2 text-xs text-slate-500 leading-relaxed">As correções feitas aqui prevalecem no perfil do atleta. As respostas originais do questionário continuam preservadas.</p>
            </> : <p className="col-span-2 text-xs text-slate-500 leading-relaxed">Os dados pessoais, o histórico e a rotina serão preenchidos pelo atleta no questionário enviado por link.</p>}
          </div>

          {error && <p className="text-red-600 text-xs font-bold">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose}
              className="px-4 py-2 text-sm font-bold border border-slate-200 rounded-md hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm font-black bg-amber-500 text-black rounded-md hover:bg-amber-400 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Atleta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
