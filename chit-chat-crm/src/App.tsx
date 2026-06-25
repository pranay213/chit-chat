import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Shield, Settings, 
  MessageSquare, Phone, Activity, Bell, Search, LogOut 
} from 'lucide-react';
import './index.css';

// --- Components ---
const Sidebar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <MessageSquare className="sidebar-brand-icon" size={28} />
        <span>ChitChat CRM</span>
      </div>
      <nav className="nav-menu">
        <Link to="/" className={`nav-item ${isActive('/')}`}>
          <LayoutDashboard size={20} /> Dashboard
        </Link>
        <Link to="/users" className={`nav-item ${isActive('/users')}`}>
          <Users size={20} /> Users
        </Link>
        <Link to="/roles" className={`nav-item ${isActive('/roles')}`}>
          <Shield size={20} /> Roles & Permissions
        </Link>
        <Link to="/chats" className={`nav-item ${isActive('/chats')}`}>
          <MessageSquare size={20} /> Chats
        </Link>
        <Link to="/calls" className={`nav-item ${isActive('/calls')}`}>
          <Phone size={20} /> Call Logs
        </Link>
        <Link to="/settings" className={`nav-item ${isActive('/settings')}`}>
          <Settings size={20} /> System Settings
        </Link>
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        <button className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
          <LogOut size={20} /> Logout
        </button>
      </div>
    </aside>
  );
};

const Header = () => (
  <header className="header">
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '300px' }}>
      <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px' }}>
        <Search size={18} color="var(--text-muted)" />
        <input type="text" placeholder="Search..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ position: 'relative', cursor: 'pointer' }}>
        <Bell size={20} color="var(--text-secondary)" />
        <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%' }}></span>
      </div>
      <div className="user-profile">
        <div className="user-avatar">AD</div>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin User</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Super Admin</div>
        </div>
      </div>
    </div>
  </header>
);

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="app-container">
    <Sidebar />
    <main className="main-content">
      <Header />
      <div className="page-wrapper">
        {children}
      </div>
    </main>
  </div>
);

// --- Pages ---
const Dashboard = () => (
  <Layout>
    <h1>Overview</h1>
    <div className="stats-grid">
      {[
        { title: 'Total Users', value: '14,293', icon: <Users size={24} /> },
        { title: 'Active Chats', value: '3,842', icon: <MessageSquare size={24} /> },
        { title: 'System Status', value: 'Online', icon: <Activity size={24} />, isStatus: true },
        { title: 'Total Calls', value: '89.2k', icon: <Phone size={24} /> },
      ].map((stat, i) => (
        <div key={i} className="glass-card stat-card">
          <div className="stat-icon" style={stat.isStatus ? { color: 'var(--success)' } : {}}>{stat.icon}</div>
          <div className="stat-info">
            <h4>{stat.title}</h4>
            <p style={stat.isStatus ? { color: 'var(--success)' } : {}}>{stat.value}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Recent Users</h2>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((u) => (
              <tr key={u}>
                <td>
                  <div className="user-profile">
                    <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '12px' }}>U{u}</div>
                    <span>user{u}@example.com</span>
                  </div>
                </td>
                <td><span className="badge badge-success">Active</span></td>
                <td>2026-06-25</td>
                <td><button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </Layout>
);

const UsersPage = () => (
  <Layout>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h1>Users Management</h1>
      <button className="btn btn-primary">Add New User</button>
    </div>
    <div className="glass-card">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email / Mobile</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((u) => (
              <tr key={u}>
                <td>#USR-00{u}</td>
                <td>+1234567890{u}</td>
                <td><span className="badge badge-primary">User</span></td>
                <td><span className="badge badge-success">Online</span></td>
                <td>Just now</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Edit</button>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--danger)' }}>Block</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </Layout>
);

const RolesPage = () => (
  <Layout>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h1>Roles & Permissions</h1>
      <button className="btn btn-primary">Create Role</button>
    </div>
    <div className="stats-grid">
      <div className="glass-card">
        <h3>Super Admin</h3>
        <p style={{ marginTop: '8px', marginBottom: '16px' }}>Full access to all system features and settings.</p>
        <span className="badge badge-primary">3 Users</span>
      </div>
      <div className="glass-card">
        <h3>Moderator</h3>
        <p style={{ marginTop: '8px', marginBottom: '16px' }}>Can manage users, chats, but cannot alter system settings.</p>
        <span className="badge badge-primary">12 Users</span>
      </div>
      <div className="glass-card">
        <h3>Support Agent</h3>
        <p style={{ marginTop: '8px', marginBottom: '16px' }}>Can view call logs and handle customer chats.</p>
        <span className="badge badge-primary">45 Users</span>
      </div>
    </div>
  </Layout>
);

const SettingsPage = () => (
  <Layout>
    <h1>System Settings</h1>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div className="glass-card">
        <h2>SMS Gateway Configuration</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Configure the primary API for sending Mobile OTPs.</p>
        <form onSubmit={e => e.preventDefault()}>
          <div className="form-group">
            <label className="form-label">API Base URL</label>
            <input type="text" className="form-input" defaultValue="https://sms-gate-way.onrender.com/api/v1/messages" />
          </div>
          <div className="form-group">
            <label className="form-label">smsGatewayApiKey (x-api-key)</label>
            <input type="password" className="form-input" defaultValue="************************" />
          </div>
          <button className="btn btn-primary">Save SMS Settings</button>
        </form>
      </div>

      <div className="glass-card">
        <h2>SMTP Email Configuration</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Configure email delivery for OTPs and notifications.</p>
        <form onSubmit={e => e.preventDefault()}>
          <div className="form-group">
            <label className="form-label">SMTP Host</label>
            <input type="text" className="form-input" defaultValue="smtp.mailtrap.io" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">SMTP Port</label>
              <input type="text" className="form-input" defaultValue="2525" />
            </div>
            <div className="form-group">
              <label className="form-label">From Email</label>
              <input type="email" className="form-input" defaultValue="noreply@chitchat.com" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">SMTP User</label>
              <input type="text" className="form-input" defaultValue="admin" />
            </div>
            <div className="form-group">
              <label className="form-label">SMTP Pass</label>
              <input type="password" className="form-input" defaultValue="********" />
            </div>
          </div>
          <button className="btn btn-primary">Save SMTP Settings</button>
        </form>
      </div>
    </div>
  </Layout>
);

const PlaceholderPage = ({ title }: { title: string }) => (
  <Layout>
    <h1>{title}</h1>
    <div className="glass-card">
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <p>{title} Module - Coming Soon</p>
      </div>
    </div>
  </Layout>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/chats" element={<PlaceholderPage title="Chats Management" />} />
        <Route path="/calls" element={<PlaceholderPage title="Call Logs" />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
