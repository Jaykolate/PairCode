import { Toaster } from 'react-hot-toast'
import './App.css'
import HomePage from './pages/HomePage.jsx'
import EditorPage from './pages/EditorPage.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProtectedRoute from './Components/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import Lobby from './pages/Lobby.jsx'
import ChallengeRoom from './pages/ChallengeRoom.jsx'

function App() {
  return (
    <ThemeProvider>
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
            <Route path='/dashboard' element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path='/challenge/lobby' element={
              <ProtectedRoute>
                <Lobby />
              </ProtectedRoute>
            } />
            <Route path='/challenge/:matchId' element={
              <ProtectedRoute>
                <ChallengeRoom />
              </ProtectedRoute>
            } />
            <Route path='/' element={<LandingPage />} />
            <Route path='/join' element={<HomePage />} />
            <Route path='/editor/:roomId' element={<EditorPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
