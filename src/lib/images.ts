export async function compressToWebp(file: File, maxSide = 1600, quality = 0.84): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Arquivo não é uma imagem.')

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a imagem.')

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Falha ao converter imagem.')), 'image/webp', quality)
  })
}

export function safeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
