import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import CustomerSearch from './pages/CustomerSearch';
import CustomerDetail from './pages/CustomerDetail';
import ContractDetail from './pages/ContractDetail';

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        FINASS
        <span>Kundenverwaltung</span>
      </div>
      <NavLink to="/" end className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
        Kunden
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar />
        <div className="main">
          <Routes>
            <Route path="/" element={<CustomerSearch />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
