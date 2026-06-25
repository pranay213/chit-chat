import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, Users, Shield, Settings, 
  MessageSquare, Phone, Activity, Bell, Search, LogOut, Menu, X, Sun, Moon, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { io } from 'socket.io-client';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1/admin';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- UI Components ---
const Loader = () => (
  <div className="loader-container">
    <div className="spinner"></div>
  </div>
);

const Sidebar = ({ isOpen, toggleSidebar, isCollapsed, toggleCollapse }: any) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare className="sidebar-brand-icon" size={28} />
            <span>ChitChat CRM</span>
          </div>
          <button className="mobile-toggle" onClick={toggleSidebar} style={{ color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>
        <nav className="nav-menu">
          <Link to="/" onClick={() => window.innerWidth <= 768 && toggleSidebar()} className={`nav-item ${isActive('/')}`}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </Link>
          <Link to="/users" onClick={() => window.innerWidth <= 768 && toggleSidebar()} className={`nav-item ${isActive('/users')}`}>
            <Users size={20} /> <span>Users</span>
          </Link>
          <Link to="/roles" onClick={() => window.innerWidth <= 768 && toggleSidebar()} className={`nav-item ${isActive('/roles')}`}>
            <Shield size={20} /> <span>Roles & Permissions</span>
          </Link>
          <Link to="/chats" onClick={() => window.innerWidth <= 768 && toggleSidebar()} className={`nav-item ${isActive('/chats')}`}>
            <MessageSquare size={20} /> <span>Chats</span>
          </Link>
          <Link to="/calls" onClick={() => window.innerWidth <= 768 && toggleSidebar()} className={`nav-item ${isActive('/calls')}`}>
            <Phone size={20} /> <span>Call Logs</span>
          </Link>
          <Link to="/settings" onClick={() => window.innerWidth <= 768 && toggleSidebar()} className={`nav-item ${isActive('/settings')}`}>
            <Settings size={20} /> <span>System Settings</span>
          </Link>
        </nav>
        
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={toggleCollapse} className="nav-item hide-on-mobile" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />} <span>Collapse</span>
          </button>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const Header = ({ toggleSidebar, theme, toggleTheme }: any) => (
  <header className="header">
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <button className="mobile-toggle" onClick={toggleSidebar}>
        <Menu size={24} />
      </button>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
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

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api/v1/admin', '') : 'http://localhost:3000';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [incomingCall, setIncomingCall] = useState<any>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    
    const socket = io(SOCKET_URL, { auth: { token } });
    
    socket.on('connect', () => {
      console.log('CRM Socket connected:', socket.id);
    });

    socket.on('notification', (data) => {
      console.log('New Notification:', data);
      // Can implement web-push here or toast
    });

    socket.on('incoming_call', (data) => {
      setIncomingCall(data);
      const ringer = new Audio('/ringer.mp3');
      ringer.loop = true;
      ringer.play().catch(e => console.log('Audio play prevented by browser:', e));
      (window as any).ringerAudio = ringer;
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const acceptCall = () => {
    if ((window as any).ringerAudio) {
      (window as any).ringerAudio.pause();
    }
    alert(`Call accepted from ${incomingCall?.callerName}`);
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if ((window as any).ringerAudio) {
      (window as any).ringerAudio.pause();
    }
    setIncomingCall(null);
  };

  return (
    <div className="app-container">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        isCollapsed={sidebarCollapsed} 
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="main-content">
        <Header 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          theme={theme} 
          toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        />
        
        {incomingCall && (
          <div style={{ position: 'fixed', top: 20, right: 20, background: 'var(--bg-card)', padding: '1rem 2rem', borderRadius: 'var(--radius-md)', zIndex: 9999, border: '1px solid var(--accent-primary)', boxShadow: '0 4px 20px var(--accent-glow)' }}>
            <h3 style={{ marginBottom: '10px' }}>Incoming Call</h3>
            <p style={{ marginBottom: '15px' }}>{incomingCall.callerName} is calling...</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={acceptCall} className="btn btn-primary" style={{ background: 'var(--success)' }}><Phone size={16} /> Accept</button>
              <button onClick={rejectCall} className="btn btn-primary" style={{ background: 'var(--danger)' }}><X size={16} /> Reject</button>
            </div>
          </div>
        )}

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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark'); // Force dark for login
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      if (res.data?.token) {
        localStorage.setItem('adminToken', res.data.token);
        navigate('/');
      } else {
        setError('Login failed: Token not provided');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
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
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({ users: 0, roles: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          axios.get(`${API_URL}/users?limit=5`),
          axios.get(`${API_URL}/roles`)
        ]);
        setUsers(usersRes.data.data?.data || usersRes.data.data || []);
        setStats({
          users: usersRes.data.data?.pagination?.total || usersRes.data.data?.length || 0,
          roles: rolesRes.data.data?.length || 0
        });
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Layout><Loader /></Layout>;

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
                <tr key={u._id} onClick={() => navigate(`/users?search=${u.email || u.mobileNumber || u.username}`)} style={{ cursor: 'pointer' }} title="View details in User Management">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const page = searchParams.get('page') || '1';
      const search = searchParams.get('search') || '';
      const res = await axios.get(`${API_URL}/users`, { params: { page, limit: 10, search } });
      const data = res.data.data;
      if (data.data && data.pagination) {
        setUsers(data.data);
        setPagination(data.pagination);
      } else {
        setUsers(data); // Fallback if not paginated
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ search: searchInput, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    searchParams.set('page', newPage.toString());
    setSearchParams(searchParams);
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Users Management</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <form onSubmit={handleSearch} className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', background: 'var(--bg-card)' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search user..." 
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none' }} 
            />
          </form>
          <button className="btn btn-primary hide-on-mobile">Add New User</button>
        </div>
      </div>
      
      <div className="glass-card">
        {loading ? <Loader /> : (
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
                {users.length === 0 && <tr><td colSpan={5} style={{textAlign: 'center', color: 'var(--text-muted)'}}>No users found matching criteria</td></tr>}
              </tbody>
            </table>
            
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.totalPages}</span>
                <button 
                  className="pagination-btn" 
                  disabled={pagination.page === 1} 
                  onClick={() => handlePageChange(pagination.page - 1)}
                ><ChevronLeft size={16} /></button>
                <button 
                  className="pagination-btn" 
                  disabled={pagination.page === pagination.totalPages} 
                  onClick={() => handlePageChange(pagination.page + 1)}
                ><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

const RolesPage = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    axios.get(`${API_URL}/roles`).then(res => setRoles(res.data.data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><Loader /></Layout>;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Roles & Permissions</h1>
        <button className="btn btn-primary hide-on-mobile">Create Role</button>
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
    smtpHost: '', smtpPort: '', smtpFromEmail: '', smtpUser: '',
    cloudinaryCloudName: '', cloudinaryApiKey: '', cloudinaryApiSecret: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/settings`).then(res => {
      if (res.data.settings) setSettings(res.data.settings);
    }).catch(console.error).finally(() => setLoading(false));
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

  if (loading) return <Layout><Loader /></Layout>;

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
          <h2>Cloudinary Integration</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Configure image upload hosting.</p>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Cloud Name</label>
              <input type="text" className="form-input" value={settings.cloudinaryCloudName || ''} onChange={e => setSettings({...settings, cloudinaryCloudName: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">API Key</label>
              <input type="text" className="form-input" value={settings.cloudinaryApiKey || ''} onChange={e => setSettings({...settings, cloudinaryApiKey: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">API Secret</label>
              <input type="password" className="form-input" value={settings.cloudinaryApiSecret || ''} onChange={e => setSettings({...settings, cloudinaryApiSecret: e.target.value})} />
            </div>
            <button type="submit" className="btn btn-primary">Save Cloudinary Settings</button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

const ChatPreviewPage = () => (
  <Layout>
    <h1>Active Chats Preview</h1>
    <div className="chat-wrapper">
      <div style={{ padding: '2rem', textAlign: 'center', margin: 'auto', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', backdropFilter: 'blur(10px)' }}>
        <MessageSquare size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
        <h2>Global Chat Moderation</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Select a user conversation to begin monitoring in real-time.</p>
      </div>
    </div>
  </Layout>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/login" replace />;
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
        <Route path="/chats" element={<ProtectedRoute><ChatPreviewPage /></ProtectedRoute>} />
        <Route path="/calls" element={<ProtectedRoute><Layout><Loader /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
