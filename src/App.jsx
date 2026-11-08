import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { CategoryProvider } from './context/CategoryProvider'
import { ProductProvider } from './context/ProductProvider'
import AppRouter from './routes/AppRouter'

export default function App() {
  return (
    <AuthProvider>
      <CategoryProvider>
        <ProductProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ProductProvider>
      </CategoryProvider>
    </AuthProvider>
  )
}