import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertTriangle, PlusCircle, LayoutDashboard, BarChart3,
  Bell, Download, X, CheckCircle, LogOut, Moon, Sun, FileText,
  Wrench, Loader2, User, Lock, Calendar, Car, Users, AlertOctagon, Mail,
  Search, Clock, Eye, EyeOff, Trash2, Edit, ChevronRight
} from 'lucide-react';
// Renommage de PieChart en PieChartIcon pour éviter le conflit critique avec Recharts
import { PieChart as PieChartIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import 'leaflet/dist/leaflet.css';

// ============ CONSTANTES & STYLES UNIFIÉS ============
const SK = {
  incidents: 'saferoute_incidents',
  darkMode: 'saferoute_darkmode',
  readAlerts: 'saferoute_read_alerts',
  interventions: 'saferoute_interventions',
  user: 'saferoute_user',
  messages: 'saferoute_messages',
  favorites: 'saferoute_favorites'
};

const USERS = {
  admin: { password: 'admin', role: 'admin', nom: 'Admin SafeRoute', email: 'admin@saferoute.sn', telephone: '+221 77 000 00 01', badge: '⭐ Administrateur', zone: 'Dakar Centre' },
  agent: { password: 'agent', role: 'agent', nom: 'Agent Terrain', email: 'agent@saferoute.sn', telephone: '+221 77 000 00 02', badge: '🚔 Agent Terrain', zone: 'Grand Dakar' },
  super: { password: 'super', role: 'superviseur', nom: 'Superviseur Central', email: 'super@saferoute.sn', telephone: '+221 77 000 00 03', badge: '👑 Superviseur', zone: 'Région Dakar' }
};

const DEFAULT_INCIDENTS = [
  { id: 1, date: '2026-05-24', mois: 'Mai', lieu: 'Grand Dakar', type: 'Collision', gravite: 'Critique', coords: [14.6915, -17.443], description: 'Collision violente entre deux minibus', weather: 'Pluie', time: '08:30', vehicles: 3, injured: 12, deaths: 1, status: 'Traité', responseTime: 15, cost: 25000 },
  { id: 2, date: '2026-05-23', mois: 'Mai', lieu: 'Avenue Cheikh Anta Diop', type: 'Excès de vitesse', gravite: 'Moyenne', coords: [14.689, -17.462], description: 'Perte de contrôle d\'un deux-roues', weather: 'Sec', time: '22:15', vehicles: 1, injured: 1, deaths: 0, status: 'En cours', responseTime: 8, cost: 5000 },
  { id: 3, date: '2026-04-15', mois: 'Avril', lieu: 'Rocade Fann Bel-Air', type: 'Obstacle sur la voie', gravite: 'Faible', coords: [14.7005, -17.451], description: 'Débris de chantier non signalés', weather: 'Sec', time: '14:20', vehicles: 0, injured: 0, deaths: 0, status: 'Résolu', responseTime: 30, cost: 0 },
  { id: 4, date: '2026-04-10', mois: 'Avril', lieu: 'Rond-point Liberté 6', type: 'Piéton renversé', gravite: 'Critique', coords: [14.7158, -17.4485], description: 'Piéton heurté sur un passage clouté', weather: 'Nuit', time: '19:45', vehicles: 1, injured: 1, deaths: 0, status: 'En traitement', responseTime: 12, cost: 15000 }
];

const DEFAULT_ALERTS = [
  { id: 1, titre: 'Accident grave signalé', message: 'Collision critique sur Grand Dakar - Intervention en cours', niveau: 'Critique', heure: '08:32', zone: 'Grand Dakar', lat: 14.6915, lng: -17.443 },
  { id: 2, titre: 'Excès de vitesse', message: 'Radar Avenue Cheikh Anta Diop - Véhicule flashé à 130 km/h', niveau: 'Moyenne', heure: '22:18', zone: 'UCAD', lat: 14.689, lng: -17.462 }
];

const DEFAULT_INTERVENTIONS = [
  { id: 1, titre: 'Sécurisation Grand Dakar', zone: 'Grand Dakar', equipe: 'Brigade Nord', date: '2026-05-25', statut: 'Planifiée', duree: '4h', priorite: 'Haute', responsable: 'Capitaine Diallo', coord: [14.6915, -17.443] },
  { id: 2, titre: 'Contrôle vitesse VDN', zone: 'VDN', equipe: 'Unité Mobile', date: '2026-05-24', statut: 'En cours', duree: '6h', priorite: 'Moyenne', responsable: 'Lieutenant Diop', coord: [14.723, -17.4612] }
];

const DEFAULT_REPORTS = [
  { id: 1, titre: 'Bilan Sécurité Routière - T1 2026', date: '2026-04-01', auteur: 'Direction Opérationnelle', format: 'PDF' },
  { id: 2, titre: 'Analyse des Points Noirs - Commune de Grand Dakar', date: '2026-05-10', auteur: 'Unité SIG', format: 'PDF' }
];

const DEFAULT_MESSAGES = [
  { id: 1, from: 'Superviseur Central', subject: 'Coordination Grand Dakar', body: 'Merci de valider le rapport d\'intervention sur la zone pilote.', date: '2026-05-25', read: false }
];

const DEFAULT_PLANNING = [
  { id: 1, equipe: 'Brigade Nord', mission: 'Patrouille Secteur A', horaire: '08:00 - 16:00', zone: 'Grand Dakar / Fass' },
  { id: 2, equipe: 'Unité Mobile', mission: 'Contrôle Radar Dynamique', horaire: '14:00 - 22:00', zone: 'VDN / Cheikh Anta Diop' }
];

const zoneStats = [
  { zone: 'Grand Dakar', total: 28 },
  { zone: 'VDN', total: 22 },
  { zone: 'Liberté 6', total: 18 }
];

const GLOBAL_CSS = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
.sr-fade-in { animation: fadeIn .35s ease forwards; }
.sr-slide-in { animation: slideIn .25s ease forwards; }
.sr-card-hover { transition: all 0.25s ease; }
.sr-card-hover:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.08); }
.sr-app { display: flex; height: 100vh; overflow: hidden; }
.sr-sidebar { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; height: 100%; transition: all 0.3s ease; }
.sr-content { flex: 1; overflow-y: auto; padding: 32px; }
.sr-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
.sr-chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px; }
@media(max-width:768px){
  .sr-sidebar { position: fixed; left: -280px; top: 0; bottom: 0; z-index: 1100; }
  .sr-sidebar.sr-open { left: 0; }
  .sr-content { padding: 16px !important; }
  .sr-stats-grid, .sr-chart-grid { grid-template-columns: 1fr; }
}
`;

// ============ UTILS ============
const loadLS = (key, fallback) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};
const saveLS = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch {} };

const mkIcon = (gravite, size = 24) => {
  const color = { Critique: '#ef4444', Moyenne: '#f59e0b', Faible: '#10b981' }[gravite] || '#10b981';
  return L.divIcon({
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2], className: ''
  });
};

function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => { if (coords) map.setView(coords, map.getZoom()); }, [coords, map]);
  return null;
}

// ============ SOUS-COMPOSANTS REQUIS ============
function NotificationBadge({ count }) {
  return (
    <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 'bold', padding: '2px 6px', borderRadius: 10, minWidth: 16, textAlign: 'center' }}>
      {count}
    </span>
  );
}

function Toast({ message, type, onClose }) {
  return (
    <div className="sr-slide-in" style={{ position: 'fixed', top: 20, right: 20, zIndex: 2000, background: type === 'success' ? '#10b981' : '#3b82f6', color: '#fff', padding: '12px 20px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={16} /></button>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [identifiant, setIdentifiant] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedUser = USERS[identifiant];
    if (parsedUser && parsedUser.password === password) {
      onLogin(parsedUser);
    } else {
      setError('Identifiants incorrects (Essayer : admin / admin)');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: 40, borderRadius: 16, width: '100%', maxWidth: 400, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: '#fff' }}>
          <Shield size={32} color="#667eea" />
          <h2 style={{ margin: 0 }}>RoadSafe SN</h2>
        </div>
        {error && <div style={{ color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <label style={{ color: '#94a3b8', display: 'block', marginBottom: 6, fontSize: 14 }}>Identifiant d'accès</label>
        <input type="text" value={identifiant} onChange={e => setIdentifiant(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', marginBottom: 16, boxSizing: 'border-box' }} />
        <label style={{ color: '#94a3b8', display: 'block', marginBottom: 6, fontSize: 14 }}>Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', marginBottom: 24, boxSizing: 'border-box' }} />
        <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 8, background: '#667eea', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Se connecter</button>
      </form>
    </div>
  );
}

// ============ APPLICATION PRINCIPALE ============
export default function App() {
  const [user, setUser] = useState(() => loadLS(SK.user, null));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [darkMode, setDarkMode] = useState(() => loadLS(SK.darkMode, false));
  const [sidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [incidents, setIncidents] = useState(() => loadLS(SK.incidents, DEFAULT_INCIDENTS));
  const [readAlertIds] = useState(() => loadLS(SK.readAlerts, []));
  const [interventions, setInterventions] = useState(() => loadLS(SK.interventions, DEFAULT_INTERVENTIONS));
  const [messages] = useState(() => loadLS(SK.messages, DEFAULT_MESSAGES));
  
  const [mapCenter, setMapCenter] = useState([14.6937, -17.4479]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newIncident, setNewIncident] = useState({
    lieu: '', type: 'Collision', gravite: 'Moyenne', lat: '14.6937', lng: '-17.4479',
    desc: '', weather: 'Sec', time: '12:00', vehicles: 1, injured: 0, deaths: 0
  });

  const theme = {
    bg: darkMode ? '#0f172a' : '#f3f4f6',
    card: darkMode ? '#1e293b' : '#ffffff',
    text: darkMode ? '#f1f5f9' : '#1f2937',
    textSec: darkMode ? '#94a3b8' : '#6b7280',
    border: darkMode ? '#334155' : '#e5e7eb',
    primary: '#667eea',
    secondary: '#764ba2'
  };

  const cardStyle = { background: theme.card, borderRadius: 16, padding: 20, border: '1px solid ' + theme.border, transition: 'all 0.3s ease' };
  const btnStyle = { padding: '10px 16px', borderRadius: 10, border: 'none', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 };
  const inputStyle = { width: '100%', padding: 12, borderRadius: 10, border: '1px solid ' + theme.border, background: darkMode ? '#0f172a' : '#fff', color: theme.text, marginBottom: 12, boxSizing: 'border-box', outline: 'none' };

  const addToast = useCallback((msg, type) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    return !searchTerm || inc.lieu.toLowerCase().includes(searchTerm.toLowerCase()) || inc.type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: filteredIncidents.length,
    critiques: filteredIncidents.filter(i => i.gravite === 'Critique').length,
    blesses: filteredIncidents.reduce((s, i) => s + (i.injured || 0), 0),
    morts: filteredIncidents.reduce((s, i) => s + (i.deaths || 0), 0)
  };

  const evolutionData = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'].map((m, idx) => ({ 
    name: m, 
    incidents: filteredIncidents.filter(i => new Date(i.date).getMonth() === idx).length,
    prev: 5 + idx * 3
  }));
  
  const typeChartData = [...new Set(incidents.map(i => i.type))].map((t, idx) => ({ 
    type: t, 
    quantite: filteredIncidents.filter(i => i.type === t).length,
    color: ['#667eea', '#764ba2', '#f59e0b', '#10b981'][idx % 4]
  }));

  const unreadAlerts = DEFAULT_ALERTS.filter(a => !readAlertIds.includes(a.id)).length;
  const unreadMessages = messages.filter(m => !m.read).length;

  const handleAddIncident = (e) => {
    e.preventDefault();
    if (!newIncident.lieu) return;
    const incident = {
      id: Date.now(), date: new Date().toISOString().split('T')[0], mois: 'Mai',
      lieu: newIncident.lieu, type: newIncident.type, gravite: newIncident.gravite,
      coords: [parseFloat(newIncident.lat), parseFloat(newIncident.lng)],
      description: newIncident.desc || 'Aucune description', weather: newIncident.weather,
      time: newIncident.time, vehicles: parseInt(newIncident.vehicles, 10) || 1,
      injured: parseInt(newIncident.injured, 10) || 0, deaths: parseInt(newIncident.deaths, 10) || 0, 
      status: 'En cours'
    };
    setIncidents([incident, ...incidents]);
    setMapCenter(incident.coords);
    addToast('✅ Incident signalé avec succès', 'success');
    setNewIncident({ lieu: '', type: 'Collision', gravite: 'Moyenne', lat: '14.6937', lng: '-17.4479', desc: '', weather: 'Sec', time: '12:00', vehicles: 1, injured: 0, deaths: 0 });
    setActiveTab('dashboard');
  };

  const handleDeleteIncident = (id) => {
    if (window.confirm('⚠️ Supprimer définitivement cet incident ?')) {
      setIncidents(incidents.filter(inc => inc.id !== id));
      addToast('🗑️ Incident supprimé', 'success');
    }
  };

  useEffect(() => { saveLS(SK.incidents, incidents); }, [incidents]);
  useEffect(() => { saveLS(SK.darkMode, darkMode); }, [darkMode]);
  useEffect(() => { setTimeout(() => setIsLoading(false), 300); }, []);

  if (!user) return <LoginScreen onLogin={(u) => { setUser(u); saveLS(SK.user, u); }} />;
  if (isLoading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.bg }}><Loader2 className="sr-spin" size={48} color="#667eea" /></div>;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'report', label: 'Signalement', Icon: PlusCircle },
    { id: 'alerts', label: 'Alertes', Icon: Bell, badge: unreadAlerts },
    { id: 'interventions', label: 'Interventions', Icon: Wrench },
    { id: 'reports', label: 'Rapports', Icon: FileText },
    { id: 'messages', label: 'Messages', Icon: Mail, badge: unreadMessages }
  ];

  return (
    <div className="sr-app" style={{ background: theme.bg, color: theme.text, fontFamily: 'system-ui, sans-serif' }}>
      <style>{GLOBAL_CSS}</style>
      {toasts.map(t => <Toast key={t.id} message={t.msg} type={t.type} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />)}

      {/* Sidebar */}
      <div className={`sr-sidebar ${sidebarOpen ? 'sr-open' : ''}`} style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`, padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30, color: '#fff' }}>
          <Shield size={28} />
          <span style={{ fontWeight: 'bold', fontSize: 18 }}>RoadSafe SN</span>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none', background: activeTab === item.id ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
              <item.Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && <NotificationBadge count={item.badge} />}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{ flex: 1, padding: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => { setUser(null); localStorage.removeItem(SK.user); }} style={{ flex: 1, padding: 8, background: '#ef4444', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="sr-content">
        {activeTab === 'dashboard' && (
          <div className="sr-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 28 }}>Tableau de bord</h1>
                <p style={{ margin: '4px 0 0', color: theme.textSec }}>Suivi cartographique et décisionnel de Grand Dakar</p>
              </div>
              <div style={{ display: 'flex', gap: 6, background: theme.card, borderRadius: 10, padding: '8px 12px', border: '1px solid ' + theme.border }}>
                <Search size={16} color={theme.textSec} />
                <input type="text" placeholder="Filtrer par lieu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ background: 'none', border: 'none', color: theme.text, outline: 'none' }} />
              </div>
            </div>

            {/* KPIs */}
            <div className="sr-stats-grid" style={{ marginBottom: 24 }}>
              {[
                { label: 'Total Incidents', value: stats.total, color: theme.primary, icon: Car },
                { label: 'Points Critiques', value: stats.critiques, color: '#ef4444', icon: AlertOctagon },
                { label: 'Blessés Enregistrés', value: stats.blesses, color: '#f59e0b', icon: Users },
                { label: 'Décès', value: stats.morts, color: '#dc2626', icon: AlertTriangle }
              ].map((kpi, idx) => (
                <div key={idx} style={cardStyle} className="sr-card-hover">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 13, color: theme.textSec }}>{kpi.label}</span>
                      <h2 style={{ margin: '8px 0 0', fontSize: 24, color: kpi.color }}>{kpi.value}</h2>
                    </div>
                    <div style={{ background: `${kpi.color}15`, padding: 10, borderRadius: 10 }}><kpi.icon size={20} color={kpi.color} /></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visualisations Recharts */}
            <div className="sr-chart-grid" style={{ marginBottom: 24 }}>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Série Temporelle des Incidents</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
                      <XAxis dataKey="name" stroke={theme.textSec} />
                      <YAxis stroke={theme.textSec} />
                      <Tooltip contentStyle={{ background: theme.card, border: 'none' }} />
                      <Area type="monotone" dataKey="incidents" stroke={theme.primary} fill={theme.primary} fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Typologie géomatique</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeChartData} dataKey="quantite" nameKey="type" cx="50%" cy="50%" innerRadius={50} outerRadius={70}>
                        {typeChartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SIG - Leaflet Map Container */}
            <div style={{ ...cardStyle, padding: 0, height: 450, overflow: 'hidden' }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                <LayersControl position="topright">
                  <LayersControl.Overlay name="Incidents Actifs" checked>
                    {filteredIncidents.map(inc => (
                      <Marker key={inc.id} position={inc.coords} icon={mkIcon(inc.gravite)}>
                        <Popup>
                          <div style={{ minWidth: 160 }}>
                            <strong style={{ fontSize: 14 }}>{inc.type}</strong><br />
                            <span>📍 Lieu : {inc.lieu}</span><br />
                            <span>⚠️ Gravité : <b>{inc.gravite}</b></span><br />
                            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#555' }}>{inc.description}</p>
                            <button onClick={() => handleDeleteIncident(inc.id)} style={{ marginTop: 8, background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}><Trash2 size={12} /> Supprimer</button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </LayersControl.Overlay>
                  <LayersControl.Overlay name="Zones tampons (Hotspots)">
                    {zoneStats.map((z, i) => (
                      <Circle key={i} center={i === 0 ? [14.6915, -17.443] : [14.7158, -17.4485]} radius={500} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15 }} />
                    ))}
                  </LayersControl.Overlay>
                </LayersControl>
                <RecenterMap coords={mapCenter} />
              </MapContainer>
            </div>
          </div>
        )}

        {/* ============ FORMULAIRE DE SIGNALEMENT ============ */}
        {activeTab === 'report' && (
          <div className="sr-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={cardStyle}>
              <h2 style={{ margin: '0 0 20px' }}>Saisie d'un géo-incident</h2>
              <form onSubmit={handleAddIncident}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600' }}>Localisation (Commune / Axe)</label>
                <input type="text" placeholder="Ex: Avenue Cheikh Anta Diop" value={newIncident.lieu} onChange={e => setNewIncident({...newIncident, lieu: e.target.value})} style={inputStyle} required />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600' }}>Latitude</label>
                    <input type="text" value={newIncident.lat} onChange={e => setNewIncident({...newIncident, lat: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600' }}>Longitude</label>
                    <input type="text" value={newIncident.lng} onChange={e => setNewIncident({...newIncident, lng: e.target.value})} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600' }}>Typologie</label>
                    <select value={newIncident.type} onChange={e => setNewIncident({...newIncident, type: e.target.value})} style={inputStyle}>
                      <option value="Collision">Collision</option>
                      <option value="Excès de vitesse">Excès de vitesse</option>
                      <option value="Obstacle sur la voie">Obstacle sur la voie</option>
                      <option value="Piéton renversé">Piéton renversé</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600' }}>Niveau de Gravité</label>
                    <select value={newIncident.gravite} onChange={e => setNewIncident({...newIncident, gravite: e.target.value})} style={inputStyle}>
                      <option value="Faible">Faible (Dégâts matériels légers)</option>
                      <option value="Moyenne">Moyenne (Blessés légers)</option>
                      <option value="Critique">Critique (Urgences / Décès)</option>
                    </select>
                  </div>
                </div>

                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: '600' }}>Description factuelle</label>
                <textarea rows={3} placeholder="Détails complémentaires sur l'état de la chaussée ou les véhicules impliqués..." value={newIncident.desc} onChange={e => setNewIncident({...newIncident, desc: e.target.value})} style={{ ...inputStyle, fontFamily: 'sans-serif' }} />

                <button type="submit" style={{ ...btnStyle, background: theme.primary, color: '#fff', width: '100%', justifyContent: 'center', marginTop: 10 }}>Enregistrer le signalement</button>
              </form>
            </div>
          </div>
        )}

        {/* ============ MODULES COMPLÉMENTAIRES STABILISÉS ============ */}
        {activeTab === 'alerts' && (
          <div className="sr-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2>Alertes Info-Route Réseau</h2>
            {DEFAULT_ALERTS.map(alert => (
              <div key={alert.id} style={{ ...cardStyle, borderLeft: `6px solid ${alert.niveau === 'Critique' ? '#ef4444' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{alert.titre}</strong>
                  <span style={{ fontSize: 12, color: theme.textSec }}>{alert.heure}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 14 }}>{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'interventions' && (
          <div className="sr-fade-in">
            <h2>Suivi des Unités de Terrain</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {interventions.map(inter => (
                <div key={inter.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{inter.titre}</strong>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.textSec }}>Équipe assignée : {inter.equipe} | Responsable : {inter.responsable}</p>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, background: inter.statut === 'En cours' ? '#f59e0b15' : '#10b98115', color: inter.statut === 'En cours' ? '#f59e0b' : '#10b981' }}>{inter.statut}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="sr-fade-in">
            <h2>Rapports d'Expertise & SIG</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {DEFAULT_REPORTS.map(rep => (
                <div key={rep.id} style={cardStyle} className="sr-card-hover">
                  <FileText size={32} color={theme.primary} style={{ marginBottom: 12 }} />
                  <h4>{rep.titre}</h4>
                  <p style={{ fontSize: 12, color: theme.textSec, margin: '4px 0 12px' }}>Généré le : {rep.date}</p>
                  <button style={{ ...btnStyle, background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, fontSize: 13 }}><Download size={14} /> Télécharger</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="sr-fade-in" style={cardStyle}>
            <h2>Messagerie Intranet IPAR</h2>
            {messages.map(m => (
              <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid ' + theme.border }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>De: {m.from}</strong>
                  <span style={{ fontSize: 12, color: theme.textSec }}>{m.date}</span>
                </div>
                <p style={{ fontWeight: '600', margin: '4px 0' }}>{m.subject}</p>
                <p style={{ margin: 0, fontSize: 14, color: theme.textSec }}>{m.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}