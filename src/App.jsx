
import { Toaster } from 'react-hot-toast'
import './App.css'
import HomePage from './pages/HomePage.jsx'
import EditorPage from './pages/EditorPage.jsx'
import { BrowserRouter , Routes, Route } from 'react-router-dom'

function App() {
  
  return (
    <>
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
          <Route path='/' element={<HomePage />} /> 
          <Route path='/editor/:roomId' element={<EditorPage />} />
        </Routes>
      
      </BrowserRouter>

    </>
  )
}

export default App
