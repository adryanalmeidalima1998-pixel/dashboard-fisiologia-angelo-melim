'use client'
import { useSeason } from '@/app/context/SeasonContext'
import { LEGACY_SEASON_ID, seasonStorage, storageKey } from '@/lib/seasons.mjs'
import { normalizePhotoName } from '@/lib/athlete-photo-key.mjs'


import { useState, useEffect, useRef } from 'react'

// ── MAPA DE FOTOS ESTÁTICAS (fallback) ────────────────────────────────────────
const PHOTO_MAP = {
  'adrian_da_silva_ferreira':          'adrian.png',
  'adrian':                            'adrian.png',
  'bernardo_lima':                     'bernardo_lima.png',
  'bruno_santana_vitorio':             'bruno_santana.png',
  'bruno_santana':                     'bruno_santana.png',
  'caio_flavio_martins_guimaraes':     'caio_flavio.png',
  'caio_flavio':                       'caio_flavio.png',
  'carlos_roberto_pereira':            'carlos_roberto.png',
  'carlos_roberto':                    'carlos_roberto.png',
  'daniel_da_silva_santos_junior':     'daniel_junior.png',
  'daniel_junior':                     'daniel_junior.png',
  'dhiogo_batista_barros':             'dhiogo_batista.png',
  'dhiogo_batista':                    'dhiogo_batista.png',
  'felipe_aguiar_samogim':             'felipe_samogim.png',
  'felipe_samogim':                    'felipe_samogim.png',
  'felipe_marques_toscano':            'felipe_toscano.png',
  'felipe_toscano':                    'felipe_toscano.png',
  'francisco_reidiney_duarte':         'francisco.png',
  'francisco':                         'francisco.png',
  'gabriel_correia_da_silva':          'gabriel_correia.png',
  'gabriel_correia':                   'gabriel_correia.png',
  'gustavo_mattei_hobold':             'gustavo_hobold.png',
  'gustavo_hobold':                    'gustavo_hobold.png',
  'joao_pedro_bezerra_vieira':         'joao_pedro.png',
  'joao_pedro_bezerra':                'joao_pedro.png',
  'joao_pedro_vieira':                 'joao_pedro.png',
  'joao_pedro':                        'joao_pedro.png',
  'joao_pedro_vieira_ferraz':          'joao_ferraz.png',
  'joao_ferraz':                       'joao_ferraz.png',
  'kawe_rodrigues_silva':              'kawe_rodrigues.png',
  'kawe_rodrigues':                    'kawe_rodrigues.png',
  'kayke_pereira_da_silva':            'kayki_andrade.png',
  'kayke_pereira':                     'kayki_andrade.png',
  'kayki_andrade':                     'kayki_andrade.png',
  'leonardo_goncalves_da_silva':       'leonardo_goncalves.png',
  'leonardo_goncalves':                'leonardo_goncalves.png',
  'mateus_geres_vinha_santos':         'matheus_geres.png',
  'matheus_geres_vinha_santos':        'matheus_geres.png',
  'mateus_geres':                      'matheus_geres.png',
  'matheus_geres':                     'matheus_geres.png',
  'matias_luderia_coronel':            'matias.png',
  'matias':                            'matias.png',
  'mauricio_alves_rocha':              'mauricio.png',
  'mauricio_alves':                    'mauricio.png',
  'mauricio':                          'mauricio.png',
  'nicolas_badu_reis':                 'nicolas_badu.png',
  'nicolas_badu':                      'nicolas_badu.png',
  'pedro_henrique_samanes_zenatti':    'pedro_zenatti.png',
  'pedro_henrique_samanes':            'pedro_zenatti.png',
  'pedro_zenatti':                     'pedro_zenatti.png',
  'pedro_henrique_vazan_reis':         'pedro_vazan.png',
  'pedro_henrique_vazan':              'pedro_vazan.png',
  'pedro_vazan':                       'pedro_vazan.png',
  'pedro_henrique_martins':            'pedro_henrique_martins.png',
  'pedro_miguel':                      'pedro_miguel.png',
  'plaza':                             'plaza.png',
  'rodrigo_campos_dos_santos':         'rodrigo_campos.png',
  'rodrigo_campos':                    'rodrigo_campos.png',
  'tiago_cardozo_fernandes':           'tiago_cardozo.png',
  'tiago_cardozo':                     'tiago_cardozo.png',
  'victor_henrique_cretuchi':          'victor_cretuchi.png',
  'victor_cretuchi':                   'victor_cretuchi.png',
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
export const normalizeKey = normalizePhotoName
const cloudPhotos = new Map()
const photoLoads = new Map()
function cachePhoto(name, dataUrl, seasonId) {
  cloudPhotos.set(photoStorageKey(name, seasonId), dataUrl)
  window.dispatchEvent(new CustomEvent('athlete-photo-updated', {detail:{key:photoStorageKey(name,seasonId),url:dataUrl,name}}))
}
export async function loadSeasonPhotos(apiFetch, seasonId) {
  if (!photoLoads.has(seasonId)) {
    const promise = apiFetch('/api/athlete-photos').then(async response => {
      const data=await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as fotos.')
      for (const photo of data.photos) cachePhoto(photo.athlete_name,photo.data_url,seasonId)
    }).catch(error => {photoLoads.delete(seasonId);throw error})
    photoLoads.set(seasonId,promise)
  }
  return photoLoads.get(seasonId)
}
export function AthletePhotoSync() {
  const {apiFetch,season}=useSeason()
  useEffect(()=>{loadSeasonPhotos(apiFetch,season.id).catch(()=>{})},[apiFetch,season.id])
  return null
}

export function getStaticPhoto(playerName, seasonId) {
  if (seasonId !== LEGACY_SEASON_ID) return null
  if (!playerName) return null
  const key = normalizeKey(playerName)
  if (PHOTO_MAP[key]) return '/club/' + PHOTO_MAP[key]
  const tokens = key.split('_')
  for (let i = tokens.length - 1; i >= 2; i--) {
    const partial = tokens.slice(0, i).join('_')
    if (PHOTO_MAP[partial]) return '/club/' + PHOTO_MAP[partial]
  }
  return null
}

// Alias retrocompatível
export function getAthletePhoto(playerName, seasonId) { return getStaticPhoto(playerName, seasonId) }

export function photoStorageKey(name, seasonId) { return storageKey(seasonId, 'aphoto_' + normalizeKey(name)) }

export function getCustomPhoto(name, seasonId) {
  if (typeof window === 'undefined') return null
  return cloudPhotos.get(photoStorageKey(name,seasonId)) || (()=>{try{return seasonStorage(localStorage,seasonId).getItem('aphoto_'+normalizeKey(name)) || null}catch{return null}})()
}

export function saveCustomPhoto(name, dataUrl, seasonId) {
  if (typeof window === 'undefined') return
  try {
    seasonStorage(localStorage, seasonId).setItem('aphoto_' + normalizeKey(name), dataUrl)
    window.dispatchEvent(new CustomEvent('athlete-photo-updated', {
      detail: { key: photoStorageKey(name, seasonId), url: dataUrl, name }
    }))
  } catch (e) { console.warn('Erro ao salvar foto:', e) }
}

export async function compressAndSave(name, file, onDone, seasonId, apiFetch) {
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WEBP.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Escolha uma foto de até 10 MB.')
  const objectUrl=URL.createObjectURL(file)
  let dataUrl
  try {
    const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Não foi possível abrir a imagem. Escolha outra foto.'));image.src=objectUrl})
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth>16000 || img.naturalHeight>16000) throw new Error('As dimensões desta imagem não são suportadas.')
    const canvas=document.createElement('canvas');canvas.width=300;canvas.height=300
    const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,300,300)
    const side=Math.min(img.naturalWidth,img.naturalHeight)
    context.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,300,300)
    dataUrl=canvas.toDataURL('image/jpeg',.88)
  } finally {URL.revokeObjectURL(objectUrl)}
  if (!apiFetch) throw new Error('Não foi possível conectar ao cadastro de fotos. Atualize a página.')
  const response=await apiFetch('/api/athlete-photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,dataUrl})})
  const result=await response.json();if(!response.ok)throw new Error(result.error || 'Não foi possível salvar a foto.')
  cachePhoto(name,dataUrl,seasonId)
  if(onDone)onDone(dataUrl)
  return dataUrl
}

// ── AthleteAvatar ─────────────────────────────────────────────────────────────
// clickable={true} habilita overlay de câmera + upload ao clicar
export function AthleteAvatar({ name, size = 'w-10 h-10', className = '', ring = false, clickable = true, onSaved }) {
  const { season, apiFetch } = useSeason()
  const [customPhoto, setCustomPhoto] = useState(null)
  const [hovered, setHovered]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error,setError] = useState('')
  const [saved,setSaved] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    setCustomPhoto(getCustomPhoto(name, season.id))
    const handler = (e) => {
      if (e.detail.key === photoStorageKey(name, season.id)) setCustomPhoto(e.detail.url)
    }
    window.addEventListener('athlete-photo-updated', handler)
    return () => window.removeEventListener('athlete-photo-updated', handler)
  }, [name, season.id])

  const handleFile = async (e) => {
    const file=e.target.files?.[0];e.target.value='';if(!file)return
    setSaving(true);setError('');setSaved(false)
    try{await compressAndSave(name,file,(url)=>{setCustomPhoto(url);setSaved(true);onSaved?.(url)},season.id,apiFetch)}
    catch(error){setError(error.message)}finally{setSaving(false)}
  }

  const photo    = customPhoto || getStaticPhoto(name, season.id)
  const initials = name ? name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') : '?'
  const ringCls  = ring ? 'ring-2 ring-amber-400 ring-offset-1' : ''

  const wrapProps = clickable ? {
    onClick:      (e) => { e.stopPropagation(); if(!saving)fileRef.current?.click() },
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    role:'button',tabIndex:0,'aria-label':`${photo?'Trocar':'Adicionar'} foto de ${name}`,'aria-busy':saving,
    onKeyDown:(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!saving)fileRef.current?.click()}},
    title:photo?'Clique para trocar a foto':'Clique para inserir a foto',
  } : {}

  const overlay = clickable && (hovered || saving) ? (
    <div className="absolute inset-0 rounded-full bg-black/55 flex items-center justify-center pointer-events-none">
      {saving
        ? <svg className="w-2/5 h-2/5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        : <svg className="w-2/5 h-2/5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
      }
    </div>
  ) : null

  const status = error ? <span role="alert" className="absolute top-full left-0 z-20 mt-2 min-w-48 max-w-64 rounded-md border border-red-200 bg-white p-2 text-xs text-red-700 shadow">{error}</span> : saved ? <span role="status" className="sr-only">Foto salva na plataforma.</span> : null
  const badge = clickable && !saving ? <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h4l2-3h4l2 3h4v15H4z"/><circle cx="12" cy="13" r="4"/></svg></span> : null
  const inputEl = clickable ? <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Arquivo da foto de ${name}`} className="hidden" onClick={e=>e.stopPropagation()} onChange={handleFile} /> : null

  if (photo) {
    return (
      <div className={`relative flex-shrink-0 ${size} ${clickable ? 'cursor-pointer' : ''}`} {...wrapProps}>
        <img src={photo} alt={name || ''} className={`${size} rounded-full object-cover object-top flex-shrink-0 ${ringCls} ${className}`}
          onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex' }} />
        {overlay}
        {badge}{status}{inputEl}
      </div>
    )
  }

  return (
    <div className={`relative ${size} rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 ${ringCls} ${className} ${clickable ? 'cursor-pointer' : ''}`} {...wrapProps}>
      <span className="text-slate-500 font-black text-xs leading-none select-none">{initials}</span>
      {overlay}
      {badge}{status}{inputEl}
    </div>
  )
}
