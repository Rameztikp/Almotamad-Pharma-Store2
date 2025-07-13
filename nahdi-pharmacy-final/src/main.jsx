import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FullyInteractiveApp from './FullyInteractiveApp.jsx' //
import './index.css'
createRoot(document.getElementById('root')).render(
<StrictMode>
<FullyInteractiveApp />
</StrictMode>,
)
