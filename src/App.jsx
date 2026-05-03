import { Toaster } from 'react-hot-toast'
import './App.css'
import HomePage from './pages/HomePage.jsx'
import EditorPage from './pages/EditorPage.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import History from './pages/History.jsx'
import ProtectedRoute from './Components/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <AuthProvider>
      <div>
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              theme: {
                primary: '#61dafb',
              },
            },
          }}>
        </Toaster>
      </div>

      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/history' element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          <Route path='/' element={<HomePage />} />
          <Route path='/editor/:roomId' element={<EditorPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
