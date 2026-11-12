import { OWNER } from './seasons.mjs'

// jsPDF reports do not render the application footer, so brand each PDF page.
export async function addAthravenPdfFooter(doc, season) {
  const image = await new Promise((resolve, reject) => {
    const logo = new Image()
    logo.onload = () => resolve(logo)
    logo.onerror = () => reject(new Error('Não foi possível carregar a marca do relatório.'))
    logo.src = '/brand/athraven-light.webp'
  })
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  canvas.getContext('2d').drawImage(image, 0, 0)
  const logo = canvas.toDataURL('image/png')
  const pages = doc.getNumberOfPages()
  for (let number = 1; number <= pages; number++) {
    doc.setPage(number)
    const width = doc.internal.pageSize.getWidth()
    const height = doc.internal.pageSize.getHeight()
    doc.setDrawColor(220, 224, 230)
    doc.line(14, height - 15, width - 14, height - 15)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 108, 120)
    doc.setFontSize(7)
    doc.text(`${OWNER.name} · ${season.shortName} · ${season.year}`, 14, height - 9)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${number} / ${pages}`, 14, height - 5)
    doc.addImage(logo, 'PNG', width - 68, height - 13, 13, 8, 'athraven-logo')
    doc.text('Powered by ATHRAVEN', width - 52, height - 9)
    doc.setFontSize(6)
    doc.text(`Licenciado a ${OWNER.name}`, width - 52, height - 5)
  }
}
