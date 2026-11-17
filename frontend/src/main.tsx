import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { store } from '@/app/store'
import { googleClientId } from '@/features/auth/google'
import { router } from './router.tsx'
import { DEMO } from '@/demo/demo-mode'
import { DemoBanner } from '@/demo/demo-banner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <Provider store={store}>
        {DEMO && <DemoBanner />}
        <RouterProvider router={router} />
      </Provider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
