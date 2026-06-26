import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

interface CertificatePdfInput {
  certificateNumber: string
  title: string
  body: string
  issuedAt: Date
}

export async function generateCertificatePdf(input: CertificatePdfInput) {
  const dir = join(process.cwd(), 'public', 'generated', 'certificates')
  await mkdir(dir, { recursive: true })
  const fileName = `${input.certificateNumber}.pdf`
  const filePath = join(dir, fileName)
  await writeFile(filePath, buildSimplePdf(input))
  return `/generated/certificates/${fileName}`
}

function buildSimplePdf(input: CertificatePdfInput) {
  const lines = [
    'LumaRijschool Certificate',
    input.title,
    input.body,
    `Certificate number: ${input.certificateNumber}`,
    `Issued at: ${input.issuedAt.toLocaleDateString('nl-NL')}`,
  ]
  const content = [
    'BT',
    '/F1 24 Tf',
    '72 760 Td',
    `(${escapePdf(lines[0])}) Tj`,
    '/F1 18 Tf',
    '0 -50 Td',
    `(${escapePdf(lines[1])}) Tj`,
    '/F1 12 Tf',
    ...wrapText(lines.slice(2).join('  '), 85).flatMap((line) => ['0 -24 Td', `(${escapePdf(line)}) Tj`]),
    'ET',
  ].join('\n')
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ]
  const header = '%PDF-1.4\n'
  let body = ''
  const offsets = [0]
  for (const object of objects) {
    offsets.push(Buffer.byteLength(header + body))
    body += `${object}\n`
  }
  const xrefOffset = Buffer.byteLength(header + body)
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ].join('\n')
  return Buffer.from(header + body + xref)
}

function wrapText(value: string, width: number) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line)
      line = word
    } else {
      line = `${line} ${word}`.trim()
    }
  }
  if (line) lines.push(line)
  return lines
}

function escapePdf(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
