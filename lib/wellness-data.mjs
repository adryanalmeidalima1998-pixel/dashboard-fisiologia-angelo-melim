import Papa from 'papaparse'
export function normalizeName(name) {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function parseBemEstarCSV(csvText) {
  const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true })

  return data.map(row => {
    const rawTs = row['Carimbo de data/hora'] || ''
    let timestamp
    let date = null
    if (rawTs.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      const [datePart, timePart = '00:00:00'] = rawTs.split(' ')
      const [dd, mm, yyyy] = datePart.split('/')
      date = `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
      timestamp = new Date(`${yyyy}-${mm}-${dd}T${timePart}`)
    } else {
      timestamp = new Date(rawTs)
      date = !isNaN(timestamp) ? timestamp.toISOString().split('T')[0] : null
    }
    if (!date) return null

    const _atividadeRaw = row['Atividade:'] || ''
    const _atividadeNorm = _atividadeRaw
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]/g, ' ')
      .trim().toLowerCase()
    const isPre  = _atividadeNorm.includes('pre')
    const isPost = _atividadeNorm.includes('pos') || _atividadeNorm.includes('post')
    const _hasSrpe    = !!(row['Percepção Subjetiva de Esforço:'] || '').trim()
    const _hasWellness = !!(row['Fadiga'] || row['Qualidade do Sono'] || row['Humor'] || '').toString().trim()
    const _isPre  = isPre  || (!isPost && _hasWellness && !_hasSrpe)
    const _isPost = isPost || (!isPre  && _hasSrpe)

    const fadiga = parseFloat(row['Fadiga']) || null
    const sono = parseFloat(row['Qualidade do Sono']) || null
    const doms = parseFloat(row['Dor Muscular Geral']) || null
    const estresse = parseFloat(row['Nível de Estresse']) || null
    const humor = parseFloat(row['Humor']) || null
    const corUrina = parseFloat(row['Cor da Urina']) || null
    const srpe = Number.isFinite(parseFloat(row['Percepção Subjetiva de Esforço:'])) ? parseFloat(row['Percepção Subjetiva de Esforço:']) : null
    const duracaoSessao = parseFloat(row['Tempo da Sessão em minutos (somente números)']) || null
    const dorResposta = row['Está sentindo dor localizada em um dos pontos  acima?'] || ''
    const dorLocalizada = row['Dor Localizada:'] || ''
    const temDor = dorResposta.toLowerCase() === 'sim'

    const wellnessItems = [
      fadiga ? (6 - fadiga) : null,
      sono,
      doms ? (6 - doms) : null,
      estresse ? (6 - estresse) : null,
      humor,
    ].filter(v => v !== null)

    const wellnessScore = wellnessItems.length > 0
      ? wellnessItems.reduce((a, b) => a + b, 0) / wellnessItems.length
      : null

    const rawName = row['Atleta:']?.trim()

    return {
      timestamp,
      date,
      playerName: rawName,
      _normalizedName: normalizeName(rawName),
      type: _isPre ? 'pre' : _isPost ? 'post' : 'unknown',
      fadiga, sono, doms, estresse, humor, corUrina,
      temDor,
      dorLocalizada: temDor ? dorLocalizada : '',
      srpe, duracaoSessao,
      srpeLoad: srpe !== null && duracaoSessao ? srpe * duracaoSessao : null,
      source: 'google', sessionSlot: 1, weightKg: null,
      wellnessScore,
    }
  }).filter(r => r && r.playerName && !isNaN(r.timestamp))
}


function keyOf(row){return `${normalizeName(row.playerName)}|${row.date}|${row.type}|${row.sessionSlot||1}`}
export function mergeWellnessRecords(legacy,native){const keys=new Set(native.map(keyOf)),seen=new Set();return [...legacy.filter(row=>{if(keys.has(keyOf(row)))return false;const key=`${keyOf(row)}|${new Date(row.timestamp).toISOString()}`;if(seen.has(key))return false;seen.add(key);return true}),...native].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp))}
