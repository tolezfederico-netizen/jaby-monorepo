import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Ancho de la barra de scroll, para alinear al milimetro las barras a todo el ancho
const setScrollbarWidth = () => {
  const width = window.innerWidth - document.documentElement.clientWidth
  document.documentElement.style.setProperty('--scrollbar-width', `${Math.max(0, width)}px`)
}
setScrollbarWidth()
window.addEventListener('resize', setScrollbarWidth)
// La barra aparece recien cuando carga el contenido: recalcular cuando cambie el ancho util
new ResizeObserver(setScrollbarWidth).observe(document.documentElement)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
