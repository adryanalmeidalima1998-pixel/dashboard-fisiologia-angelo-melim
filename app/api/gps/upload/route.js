import { withSeason } from '@/lib/season-server'

import {parseGpsCSV, GpsImportError} from '@/lib/gps-csv.mjs'
import {saveGpsImport} from '@/lib/gps-upload.mjs'

// ─── POST /api/gps/upload ─────────────────────────────────────────────────────
export const POST = withSeason(async function POST(request) {
  try {
    const formData = await request.formData()
    const file          = formData.get('file')
    const sessionName   = (formData.get('session_name') || '').trim()
    // Novos metadados
    const sessionType   = (formData.get('session_type') || 'treino').trim()   // 'treino' | 'jogo'
    const sessionPeriod = (formData.get('session_period') || '').trim()       // 'manha' | 'tarde' | 'noite'
    const opponent      = (formData.get('opponent') || '').trim()             // nome do adversário (se jogo)
    const result        = (formData.get('result') || '').trim()               // 'V' | 'E' | 'D' (se jogo)
    const mando         = (formData.get('mando') || '').trim()                // 'M' | 'V' (mandante/visitante)

    if (!file) {
      return Response.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }
    if (!/\.csv$/i.test(file.name || '')) {
      return Response.json({ error: 'Envie um arquivo .csv do Catapult.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) return Response.json({error:'O CSV deve ter no máximo 10 MB.'},{status:413})
    const csvText = await file.text()
    const result_parse = parseGpsCSV(csvText)

    const { sessionDate, rows, importInfo, warnings } = result_parse
    const name = sessionName || file.name.replace(/\.csv$/i, '')

    // Metadados em JSON
    const metadata = {
      gpsImport: importInfo,
      type: sessionType,
      period: sessionPeriod || null,
      opponent: opponent || null,
      result: result || null,
      mando: mando || null,
    }

    const saved=await saveGpsImport(result_parse,{name,filename:file.name,metadata})
    if(saved.duplicate)return Response.json({success:true,duplicate:true,sessionDate,sessionName:saved.name,playersCount:importInfo.playersCount,message:`Este conteúdo já está salvo em "${saved.name}" (${sessionDate}). A carga não foi duplicada.`})

    const playersCount  = [...new Set(rows.filter(r => r.periodNumber === 0 && !r.isOutlier).map(r => r.playerName))].length
    const outliersCount = rows.filter(r => r.isOutlier && r.periodNumber === 0).length
    const typeLabel = sessionType === 'jogo' ? `Jogo${opponent ? ` vs ${opponent}` : ''}` : 'Treino'

    return Response.json({
      success: true,
      sessionDate,
      sessionName: name,
      sessionType,
      sessionPeriod,
      filename: file.name,
      playersCount,
      outliersCount,
      warnings,
      importInfo,
      message: `"${name}" (${sessionDate}) — ${typeLabel} · ${playersCount} atletas.${outliersCount > 0 ? ` ${outliersCount} outlier(s).` : ''}`,
    })

  } catch (err) {
    if (err instanceof GpsImportError) return Response.json({error:err.message},{status:err.status})
    console.error('GPS upload error:', err)
    return Response.json({ error: 'Erro interno ao processar o arquivo.' }, { status: 500 })
  }
})
