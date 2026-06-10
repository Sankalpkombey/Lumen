import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Landing</div>} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/library" element={<div>Library</div>} />
        <Route path="/read/:docId" element={<div>Reader</div>} />
        <Route path="/canvas/:canvasId" element={<div>Canvas Editor</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
