import { Route, Routes } from 'react-router'
import AdminRoute from './components/AdminRoute'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import TicketsPage from './pages/TicketsPage'
import UsersPage from './pages/UsersPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
