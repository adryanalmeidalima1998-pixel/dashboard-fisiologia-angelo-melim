// A single questionnaire definition drives collection, review and PDF reports.
export const HISTORY_VERSION = 1
export const HISTORY_POSITIONS = [
  ['GK', 'Goleiro'], ['LD', 'Lateral direito'], ['LE', 'Lateral esquerdo'],
  ['ZAG', 'Zagueiro'], ['VOL', 'Meio-campista defensivo'],
  ['MEI', 'Meio-campista ofensivo'], ['ATA', 'Atacante'], ['EXT', 'Extremo'],
]
const yesNo = ['Sim', 'Não']
export const HISTORY_SECTIONS = [
  { title: 'Dados pessoais', fields: [
    { key: 'birthDate', label: 'Data de nascimento', type: 'date' },
    { key: 'origin', label: 'Cidade / estado de origem', type: 'text', max: 255 },
    { key: 'heightCm', label: 'Altura (cm)', type: 'decimal', min: 100, max: 250 },
    { key: 'weightKg', label: 'Peso (kg)', type: 'decimal', min: 20, max: 250 },
    { key: 'position', label: 'Posição em que atua', type: 'select', options: HISTORY_POSITIONS },
    { key: 'dominantFoot', label: 'Pé dominante', type: 'select', options: ['Destro', 'Canhoto'] },
  ] },
  { title: 'Histórico de clubes', fields: [
    { key: 'clubs', label: 'Quais clubes você já defendeu? Inclua categoria e ano.', type: 'textarea', max: 6000 },
    { key: 'officialCompetition', label: 'Participou de alguma competição oficial nos últimos 12 meses?', type: 'select', options: yesNo },
    { key: 'gamesSixMonths', label: 'Número aproximado de jogos disputados nos últimos 6 meses', type: 'integer', min: 0, max: 200 },
    { key: 'minutesSixMonths', label: 'Número aproximado de minutos jogados nos últimos 6 meses', type: 'integer', min: 0, max: 30000 },
  ] },
  { title: 'Histórico de lesões e cirurgias', fields: [
    { key: 'significantInjury', label: 'Já sofreu alguma lesão muscular ou óssea significativa?', type: 'select', options: yesNo },
    { key: 'injuryDetails', label: 'Descreva quais foram as lesões', type: 'textarea', max: 6000, when: ['significantInjury', 'Sim'] },
    { key: 'surgery', label: 'Já passou por cirurgia?', type: 'select', options: yesNo },
    { key: 'surgeryDetails', label: 'Descreva qual foi a cirurgia', type: 'textarea', max: 6000, when: ['surgery', 'Sim'] },
  ] },
  { title: 'Rotina diária', fields: [
    { key: 'extraWork', label: 'Realiza algum trabalho físico complementar fora do clube?', type: 'select', options: yesNo },
    { key: 'extraWorkDetails', label: 'Descreva qual trabalho complementar realiza', type: 'textarea', max: 3000, when: ['extraWork', 'Sim'] },
    { key: 'sleep', label: 'Costuma dormir quantas horas por dia?', type: 'select', options: ['5–6 horas', '6–8 horas', '8–10 horas', 'Mais de 10 horas', 'Tenho insônia e durmo mal'] },
    { key: 'alcohol', label: 'Faz uso de bebidas alcoólicas?', type: 'select', options: ['Sim', 'Não', 'Às vezes, em ocasiões especiais'] },
    { key: 'nutrition', label: 'Possui acompanhamento nutricional?', type: 'select', options: yesNo },
    { key: 'supplements', label: 'Utiliza algum suplemento?', type: 'select', options: yesNo },
    { key: 'supplementDetails', label: 'Descreva quais suplementos utiliza', type: 'textarea', max: 3000, when: ['supplements', 'Sim'] },
    { key: 'psychology', label: 'Possui acompanhamento psicológico?', type: 'select', options: yesNo },
    { key: 'medication', label: 'Utiliza algum medicamento?', type: 'select', options: yesNo },
    { key: 'medicationDetails', label: 'Descreva quais medicamentos utiliza', type: 'textarea', max: 3000, when: ['medication', 'Sim'] },
    { key: 'notes', label: 'Observações adicionais', type: 'textarea', max: 3000, optional: true },
  ] },
]
export const visibleHistoryField = (field, answers) => !field.when || answers[field.when[0]] === field.when[1]
export const historyOptions = field => (field.options || []).map(option => Array.isArray(option) ? option : [option, option])
export function historyValue(field, value) {
  if (value === '' || value == null) return 'Não informado'
  if (field.type === 'date') return String(value).split('-').reverse().join('/')
  if (field.type === 'select') return historyOptions(field).find(([key]) => key === value)?.[1] || String(value)
  if (field.type === 'decimal') return Number(String(value).replace(',', '.')).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  return String(value)
}
export class HistoryError extends Error { constructor(message, status = 400) { super(message); this.status = status } }
export function validateHistorySection(section, answers, today = new Date().toISOString().slice(0, 10)) {
  const cleaned = {}
  for (const field of section.fields) {
    if (!visibleHistoryField(field, answers)) { cleaned[field.key] = null; continue }
    const raw = answers[field.key]
    if (raw == null || raw === '') {
      if (field.optional) { cleaned[field.key] = ''; continue }
      throw new HistoryError(`Responda: ${field.label}.`)
    }
    if (field.type === 'integer' || field.type === 'decimal') {
      const text = String(raw).trim().replace(',', '.')
      const value = Number(text)
      if (!/^\d+(\.\d{1,2})?$/.test(text) || !Number.isFinite(value) || value < field.min || value > field.max || (field.type === 'integer' && !Number.isInteger(value)))
        throw new HistoryError(`${field.label}: informe ${field.type === 'integer' ? 'um número inteiro' : 'um valor'} entre ${field.min} e ${field.max}.`)
      cleaned[field.key] = value
    } else if (field.type === 'select') {
      if (!historyOptions(field).some(([value]) => value === raw)) throw new HistoryError(`Selecione uma opção válida: ${field.label}.`)
      cleaned[field.key] = raw
    } else if (field.type === 'date') {
      if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || !Number.isFinite(Date.parse(raw)) || new Date(raw).toISOString().slice(0, 10) !== raw || raw < '1900-01-01' || raw >= today)
        throw new HistoryError('Informe uma data de nascimento válida, anterior a hoje.')
      cleaned[field.key] = raw
    } else {
      if (typeof raw !== 'string' || !raw.trim() && !field.optional || raw.trim().length > field.max || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw))
        throw new HistoryError(`${field.label}: preencha em até ${field.max} caracteres.`)
      cleaned[field.key] = raw.trim()
    }
  }
  return cleaned
}
export function validateHistory(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new HistoryError('Resposta inválida.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.submissionId || '')) throw new HistoryError('Identificador de envio inválido. Reabra o formulário.')
  const athleteId = Number(payload.athleteId)
  if (!Number.isSafeInteger(athleteId) || athleteId < 1) throw new HistoryError('Selecione seu nome no elenco.')
  if (!payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) throw new HistoryError('Preencha o questionário.')
  const answers = Object.assign({}, ...HISTORY_SECTIONS.map(section => validateHistorySection(section, payload.answers)))
  return { submissionId: payload.submissionId.toLowerCase(), athleteId, version: HISTORY_VERSION, answers }
}
