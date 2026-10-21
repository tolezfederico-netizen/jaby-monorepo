// Redimensiona a 800 px de ancho como máximo y baja la calidad JPEG hasta entrar en maxSizeKb.
// El resultado siempre es image/jpeg.
export function compressImage(
  file: File,
  options: { maxSizeKb: number; quality: number } = { maxSizeKb: 45, quality: 0.7 }
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)

      const MAX_WIDTH = 800
      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas no disponible'))
      ctx.drawImage(img, 0, 0, width, height)

      let quality = options.quality
      const attempt = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Error al comprimir imagen'))
            if (blob.size <= options.maxSizeKb * 1024 || quality <= 0.1) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }))
            } else {
              quality -= 0.1
              attempt()
            }
          },
          'image/jpeg',
          quality
        )
      }
      attempt()
    }
    img.onerror = () => reject(new Error('Error al cargar imagen'))
    img.src = url
  })
}
