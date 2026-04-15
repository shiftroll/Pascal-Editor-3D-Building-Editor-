'use client'

/**
 * Captures the current 3D viewport as a base64 PNG data URL.
 * Used to send the scene render to the AI vision API for analysis.
 *
 * This reads directly from the WebGPU canvas element — simple and
 * avoids the complexity of setting up a dedicated RenderTarget pipeline.
 */
export function captureViewportAsDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Find the R3F canvas element
    const canvas = document.querySelector('canvas')
    if (!canvas) {
      reject(new Error('No canvas element found'))
      return
    }

    try {
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl)
    } catch {
      // WebGPU canvas may need a different approach
      // Try creating a temporary canvas and drawing from the WebGPU canvas
      try {
        const tmpCanvas = document.createElement('canvas')
        tmpCanvas.width = canvas.width
        tmpCanvas.height = canvas.height
        const ctx = tmpCanvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to create 2D context'))
          return
        }
        ctx.drawImage(canvas, 0, 0)
        resolve(tmpCanvas.toDataURL('image/png'))
      } catch (err) {
        reject(new Error(`Failed to capture viewport: ${err}`))
      }
    }
  })
}
