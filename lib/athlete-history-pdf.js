import { jsPDF } from 'jspdf'
import autoTableModule from 'jspdf-autotable'
import { HISTORY_SECTIONS, historyValue, visibleHistoryField } from './athlete-history-rules.mjs'
import { addAthravenPdfFooter } from './pdf-brand.js'
export const historyDateLabel = value => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
const autoTable = typeof autoTableModule === 'function' ? autoTableModule : autoTableModule.default
export function buildHistoryPdf({ season, athletes, responses, individual = false }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setProperties({ title: individual ? `Histórico de atleta - ${athletes[0]?.name}` : 'Histórico geral de atletas', author: 'Ângelo Melim', subject: `${season.shortName} ${season.year}` })
  function heading(title, subtitle) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(20, 30, 44)
    const lines = doc.splitTextToSize(title, 180)
    doc.text(lines, 14, 20)
    const y = 20 + (lines.length - 1) * 7
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(85, 95, 110)
    doc.text(`${season.shortName} · Temporada ${season.year} · Ângelo Melim`, 14, y + 8)
    const sub = doc.splitTextToSize(subtitle, 180)
    doc.text(sub, 14, y + 14)
    return y + 21 + (sub.length - 1) * 4
  }
  const table = (options) => autoTable(doc, { margin: { left: 14, right: 14, top: 16, bottom: 21 }, styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'top', textColor: [36, 45, 58], lineColor: [227, 231, 237], lineWidth: .15 }, headStyles: { fillColor: [18, 32, 53], textColor: 255, fontStyle: 'bold' }, theme: 'grid', ...options })
  if (!individual) {
    const y = heading('Histórico geral de atletas', 'Questionários respondidos pelos atletas. Informações autodeclaradas; registros de lesões da comissão permanecem separados.')
    const answered = athletes.filter(a => responses.some(r => r.athlete_id === a.id))
    table({ startY: y, head: [['Atleta', 'Situação', 'Recebido em']], body: athletes.map(a => { const r = responses.find(r => r.athlete_id === a.id); return [a.name, r ? 'Respondido' : 'Pendente', r ? historyDateLabel(r.created_at) : '-'] }), columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 35 } } })
    doc.setFontSize(8); doc.text(`${answered.length} respondidos · ${athletes.length - answered.length} pendentes`, 14, Math.min(doc.lastAutoTable.finalY + 7, 275))
  }
  let details = 0
  for (const athlete of athletes) {
    const response = responses.find(r => r.athlete_id === athlete.id)
    if (!response) continue
    if (!individual || details) doc.addPage()
    const y = heading(athlete.name, `Questionário recebido em ${historyDateLabel(response.created_at)}. Informações autodeclaradas pelo atleta.${response.is_current === false ? ' Versão anterior preservada.' : ''}`)
    for (let index = 0; index < HISTORY_SECTIONS.length; index++) {
      const section = HISTORY_SECTIONS[index]
      table({ startY: index === 0 ? y : doc.lastAutoTable.finalY + 7, head: [[{ content: section.title, colSpan: 2 }]], body: section.fields.filter(field => visibleHistoryField(field, response.answers)).map(field => [field.label, historyValue(field, response.answers[field.key])]), columnStyles: { 0: { cellWidth: 79 }, 1: { cellWidth: 103 } } })
    }
    details++
  }
  return doc
}
export async function downloadHistoryPdf(options) {
  const doc = buildHistoryPdf(options)
  await addAthravenPdfFooter(doc, options.season)
  const name = options.individual ? options.athletes[0].name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() : 'elenco'
  doc.save(`historico-${name}-${options.season.year}.pdf`)
}
