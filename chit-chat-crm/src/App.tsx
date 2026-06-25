import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, Shield, Settings, 
  MessageSquare, Phone, Activity, Bell, Search, LogOut, Menu, X 
} from 'lucide-react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/admin';

// --- Axios Interceptor ---
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Components ---
const Sidebar = ({ isOpen, toggleSidebar }: { isOpen: boolean, toggleSidebar: () => void }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare className="sidebar-brand-icon" size={28} />
            <span>ChitChat CRM</span>
          </div>
          <button className="mobile-toggle" onClick={toggleSidebar} style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        <nav className="nav-menu">
          <Link to="/" onClick={toggleSidebar} className={`nav-item ${isActive('/')}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/users" onClick={toggleSidebar} className={`nav-item ${isActive('/users')}`}>
            <Users size={20} /> Users
          </Link>
          <Link to="/roles" onClick={toggleSidebar} className={`nav-item ${isActive('/roles')}`}>
            <Shield size={20} /> Roles & Permissions
          </Link>
          <Link to="/chats" onClick={toggleSidebar} className={`nav-item ${isActive('/chats')}`}>
            <MessageSquare size={20} /> Chats
          </Link>
          <Link to="/calls" onClick={toggleSidebar} className={`nav-item ${isActive('/calls')}`}>
            <Phone size={20} /> Call Logs
          </Link>
          <Link to="/settings" onClick={toggleSidebar} className={`nav-item ${isActive('/settings')}`}>
            <Settings size={20} /> System Settings
          </Link>
        </nav>
        
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
};

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => (
  <header className="header">
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <button className="mobile-toggle" onClick={toggleSidebar}>
        <Menu size={24} />
      </button>
      <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', maxWidth: '300px' }}>
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
        <div className="hide-on-mobile">
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Admin User</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Super Admin</div>
        </div>
      </div>
    </div>
  </header>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <main className="main-content">
        <Header toggleSidebar={toggleSidebar} />
        <div className="page-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

// --- Pages ---
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      if (res.data.data?.token) {
        localStorage.setItem('adminToken', res.data.data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <MessageSquare className="sidebar-brand-icon" size={48} style={{ margin: '0 auto 1rem' }} />
          <h2>Admin Login</h2>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" required className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" required className="form-input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({ users: 0, roles: 0, calls: 0, chats: 0 });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          axios.get(`${API_URL}/users`),
          axios.get(`${API_URL}/roles`)
        ]);
        setUsers(usersRes.data.data?.slice(0, 5) || []);
        setStats({
          users: usersRes.data.data?.length || 0,
          roles: rolesRes.data.data?.length || 0,
          calls: 142, // Real API integration pending for counts
          chats: 34
        });
      } catch (err) {
        console.error("Dashboard fetch error", err);
      }
    };
    fetchData();
  }, []);

  return (
    <Layout>
      <h1>Overview</h1>
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info"><h4>Total Users</h4><p>{stats.users}</p></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon"><Shield size={24} /></div>
          <div className="stat-info"><h4>System Roles</h4><p>{stats.roles}</p></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ color: 'var(--success)' }}><Activity size={24} /></div>
          <div className="stat-info"><h4>System Status</h4><p style={{ color: 'var(--success)' }}>Online</p></div>
        </div>
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
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u._id}>
                  <td>
                    <div className="user-profile">
                      <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '12px' }}>
                        {u.username?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span>{u.email || u.mobileNumber || u.username}</span>
                    </div>
                  </td>
                  <td><span className={`badge ${u.status === 'online' ? 'badge-success' : 'badge-warning'}`}>{u.status || 'offline'}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

const UsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    axios.get(`${API_URL}/users`).then(res => setUsers(res.data.data || [])).catch(console.error);
  }, []);

  return (
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
                <th>Identifier</th>
                <th>Username</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u._id}>
                  <td>{u._id.substring(0, 8)}...</td>
                  <td>{u.email || u.mobileNumber}</td>
                  <td>{u.username || '-'}</td>
                  <td><span className={`badge ${u.status === 'online' ? 'badge-success' : 'badge-warning'}`}>{u.status || 'offline'}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center', color: 'var(--text-muted)'}}>No users found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

const RolesPage = () => {
  const [roles, setRoles] = useState<any[]>([]);
  useEffect(() => {
    axios.get(`${API_URL}/roles`).then(res => setRoles(res.data.data || [])).catch(console.error);
  }, []);

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Roles & Permissions</h1>
        <button className="btn btn-primary">Create Role</button>
      </div>
      <div className="stats-grid">
        {roles.map(role => (
          <div key={role._id} className="glass-card">
            <h3>{role.name}</h3>
            <p style={{ marginTop: '8px', marginBottom: '16px' }}>{role.description || 'System access role.'}</p>
            <span className="badge badge-primary">{role.permissions?.length || 0} Permissions</span>
          </div>
        ))}
        {roles.length === 0 && <p style={{color: 'var(--text-muted)'}}>No roles configured.</p>}
      </div>
    </Layout>
  );
};

const SettingsPage = () => {
  const [settings, setSettings] = useState<any>({
    smsGatewayApiKey: '',
    smtpHost: '',
    smtpPort: '',
    smtpFromEmail: '',
    smtpUser: ''
  });

  useEffect(() => {
    axios.get(`${API_URL}/settings`).then(res => {
      if (res.data.data) setSettings(res.data.data);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/settings`, settings);
      alert("Settings updated successfully!");
    } catch (err) {
      alert("Failed to update settings");
    }
  };

  return (
    <Layout>
      <h1>System Settings</h1>
      
      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="glass-card">
          <h2>SMS Gateway Configuration</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Configure the primary API for sending Mobile OTPs.</p>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">smsGatewayApiKey (x-api-key)</label>
              <input type="text" className="form-input" value={settings.smsGatewayApiKey || ''} onChange={e => setSettings({...settings, smsGatewayApiKey: e.target.value})} />
            </div>
            <button type="submit" className="btn btn-primary">Save SMS Settings</button>
          </form>
        </div>

        <div className="glass-card">
          <h2>SMTP Email Configuration</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Configure email delivery for OTPs and notifications.</p>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">SMTP Host</label>
              <input type="text" className="form-input" value={settings.smtpHost || ''} onChange={e => setSettings({...settings, smtpHost: e.target.value})} />
            </div>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">SMTP Port</label>
                <input type="number" className="form-input" value={settings.smtpPort || ''} onChange={e => setSettings({...settings, smtpPort: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">From Email</label>
                <input type="email" className="form-input" value={settings.smtpFromEmail || ''} onChange={e => setSettings({...settings, smtpFromEmail: e.target.value})} />
              </div>
            </div>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">SMTP User</label>
                <input type="text" className="form-input" value={settings.smtpUser || ''} onChange={e => setSettings({...settings, smtpUser: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">SMTP Pass</label>
                <input type="password" placeholder="********" className="form-input" onChange={e => setSettings({...settings, smtpPass: e.target.value})} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Save SMTP Settings</button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/roles" element={<ProtectedRoute><RolesPage /></ProtectedRoute>} />
        <Route path="/chats" element={<ProtectedRoute><PlaceholderPage title="Chats Management" /></ProtectedRoute>} />
        <Route path="/calls" element={<ProtectedRoute><PlaceholderPage title="Call Logs" /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
