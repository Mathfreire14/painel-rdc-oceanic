'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Search, LogOut, Users, LayoutDashboard, UserPlus, Trash2, Mail, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OperadorData {
  nome_operador: string;
  setores_exibicao: string;
  total_trocadas: number;
  enviadas_custo: number;
  recebidas_gratis: number;
  total_templates: number;
  total_bot: number;
}

const TARIFA_SERVICO = 0.043;

// Envia o token da sessão para as APIs protegidas
async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
}
const TARIFA_TEMPLATE = 0.35;

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'usuarios'>('dashboard');
  const [sessaoOk, setSessaoOk] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // --- ESTADOS DO DASHBOARD ---
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<OperadorData[]>([]);
  const [setorFiltro, setSetorFiltro] = useState('TODOS');
  const [buscaOperador, setBuscaOperador] = useState('');

  // --- ESTADOS DE USUÁRIOS ---
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Sem login, volta para a tela de login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setIsAdmin(data.session.user.app_metadata?.role === 'admin');
      setSessaoOk(true);
    });
  }, [router]);

  useEffect(() => {
    if (!sessaoOk) return;
    async function carregarDadosDashboard() {
      setLoading(true);
      const { data, error } = await supabase.from('vw_performance_operadores').select('*');
      if (data && !error) setDados(data);
      setLoading(false);
    }
    carregarDadosDashboard();
  }, [sessaoOk]);

  useEffect(() => {
    if (activeTab === 'usuarios') {
      carregarUsuarios();
    }
  }, [activeTab]);

  // --- LÓGICA DA API DE USUÁRIOS ---
  async function carregarUsuarios() {
    setLoadingUsuarios(true);
    try {
      // CORREÇÃO: Atualizado para a subpasta users
      const res = await fetch('/api/auth/users', { headers: await authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  async function handleCriarUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!novoEmail || !novaSenha) return alert('Preencha o e-mail e a palavra-passe.');
    
    setIsCreating(true);
    try {
      // CORREÇÃO: Atualizado para a subpasta users
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ email: novoEmail, password: novaSenha })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('Usuário criado com sucesso!');
        setNovoEmail('');
        setNovaSenha('');
        carregarUsuarios(); // Atualiza a lista
      } else {
        alert('Erro ao criar usuário: ' + data.error);
      }
    } catch (err) {
      alert('Erro inesperado de conexão.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleExcluirUsuario(id: string, email: string) {
    if (!window.confirm(`Tem a certeza que deseja revogar o acesso de ${email}?`)) return;

    try {
      // CORREÇÃO: Atualizado para a subpasta users
      const res = await fetch(`/api/auth/users?id=${id}`, { method: 'DELETE', headers: await authHeaders() });
      if (res.ok) {
        alert('Usuário removido com sucesso!');
        carregarUsuarios(); // Atualiza a lista
      } else {
        const data = await res.json();
        alert('Erro ao excluir: ' + data.error);
      }
    } catch (err) {
      alert('Erro inesperado de conexão.');
    }
  }

  // --- CÁLCULOS DO DASHBOARD ---
  const todosSetores = dados.flatMap(d => (d.setores_exibicao || '').split(',').map(s => s.trim()));
  const setoresUnicos = Array.from(new Set(todosSetores)).filter(Boolean).sort();

  const dadosFiltrados = dados.filter(op => {
    const matchSetor = setorFiltro === 'TODOS' || (op.setores_exibicao && op.setores_exibicao.includes(setorFiltro));
    const matchBusca = op.nome_operador.toLowerCase().includes(buscaOperador.toLowerCase());
    return matchSetor && matchBusca;
  });

  const totalEnviadas = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.enviadas_custo || 0), 0);
  const totalRecebidas = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.recebidas_gratis || 0), 0);
  const totalTemplates = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.total_templates || 0), 0);
  const totalBot = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.total_bot || 0), 0);
  
  const custoTotal = (totalEnviadas * TARIFA_SERVICO) + (totalTemplates * TARIFA_TEMPLATE);

  if (!sessaoOk) return null;

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-slate-800 font-sans p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* CABEÇALHO GERAL */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2b3c]">Painel de Controle - API Meta / RD</h1>
            <p className="text-sm text-slate-500 mt-1">Gestão de Consumo e Acessos do Sistema.</p>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); router.push('/login'); }}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-slate-50 shadow-sm transition-all"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>

        {/* NAVEGAÇÃO EM ABAS */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-[#2b74e2] text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard de Consumo
          </button>
          {isAdmin && (
          <button 
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'usuarios' ? 'bg-[#2b74e2] text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Users className="h-4 w-4" /> Gestão de Acessos
          </button>
          )}
        </div>

        {/* =========================================
            ABA 1: DASHBOARD
        ============================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 w-full md:w-auto">
                <Building2 className="h-4 w-4 text-[#2b74e2]" />
                <select 
                  value={setorFiltro} onChange={(e) => setSetorFiltro(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="TODOS">Todos os Setores</option>
                  {setoresUnicos.map((s, i) => <option key={i} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text" placeholder="Buscar por atendente..."
                  value={buscaOperador} onChange={(e) => setBuscaOperador(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-[#2b74e2] focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border-l-4 border-l-[#2b74e2] bg-white p-5 shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Custo Total (Estimado)</div>
                <div className="mt-2 text-2xl font-black text-[#2b74e2]">R$ {custoTotal.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border-l-4 border-l-[#00c8b3] bg-white p-5 shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Enviadas (Com Custo)</div>
                <div className="mt-2 text-2xl font-black text-[#00c8b3]">{totalEnviadas}</div>
                <div className="text-[11px] text-slate-400 mt-1">R$ 0,043 / msg</div>
              </div>
              <div className="rounded-lg border-l-4 border-l-[#8a3ffc] bg-white p-5 shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Recebidas (Grátis)</div>
                <div className="mt-2 text-2xl font-black text-[#8a3ffc]">{totalRecebidas}</div>
                <div className="text-[11px] text-slate-400 mt-1">Custo Zero</div>
              </div>
              <div className="rounded-lg border-l-4 border-l-[#f1c21b] bg-white p-5 shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Retenção Bot / IA</div>
                <div className="mt-2 text-2xl font-black text-[#f1c21b]">{totalBot}</div>
                <div className="text-[11px] text-slate-400 mt-1">Interações sem humano</div>
              </div>
              <div className="rounded-lg border-l-4 border-l-[#ff832b] bg-white p-5 shadow-sm border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">Templates / Ativos</div>
                <div className="mt-2 text-2xl font-black text-[#ff832b]">{totalTemplates}</div>
                <div className="text-[11px] text-slate-400 mt-1">R$ 0,35 / disparo</div>
              </div>
            </div>

            {/* Tabela */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-white">
                <h2 className="text-base font-bold text-[#1a2b3c]">Consumo Gerado por Atendente / IA</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Agente / Operador</th>
                      <th className="px-5 py-3">Setores de Atuação</th>
                      <th className="px-5 py-3 text-center">Trocadas</th>
                      <th className="px-5 py-3 text-center">Enviadas (Custo)</th>
                      <th className="px-5 py-3 text-center">Recebidas (Grátis)</th>
                      <th className="px-5 py-3 text-right">Custo Estimado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-400">Calculando matriz...</td></tr>
                    ) : dadosFiltrados.map((op, idx) => {
                        const custoLinha = (op.enviadas_custo * TARIFA_SERVICO) + (op.total_templates * TARIFA_TEMPLATE);
                        const isBot = op.nome_operador.includes('Automação') || op.nome_operador.includes('Bot');
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className={`px-5 py-4 font-bold ${isBot ? 'text-[#f1c21b]' : 'text-slate-900'}`}>{op.nome_operador}</td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1">
                                {op.setores_exibicao?.split(',').map((setor, sIdx) => (
                                  <span key={sIdx} className="inline-block bg-slate-100 border border-slate-200 text-slate-600 rounded px-2 py-0.5 text-[11px] font-semibold">{setor.trim()}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center font-medium">{op.total_trocadas}</td>
                            <td className="px-5 py-4 text-center font-bold text-[#00c8b3]">{op.enviadas_custo}</td>
                            <td className="px-5 py-4 text-center font-medium text-[#8a3ffc]">{op.recebidas_gratis}</td>
                            <td className="px-5 py-4 text-right font-black text-[#2b74e2]">R$ {custoLinha.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            ABA 2: GESTÃO DE ACESSOS (USUÁRIOS)
        ============================================= */}
        {activeTab === 'usuarios' && isAdmin && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Formulário de Criação */}
              <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-fit">
                <h2 className="text-base font-bold text-[#1a2b3c] mb-5 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#2b74e2]" /> Novo Acesso
                </h2>
                <form onSubmit={handleCriarUsuario} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> E-mail
                    </label>
                    <input 
                      type="email" required
                      value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#2b74e2] focus:bg-white outline-none transition-colors" 
                      placeholder="admin@grupooceanic.com.br"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <Key className="h-3 w-3" /> Palavra-passe
                    </label>
                    <input 
                      type="password" required minLength={8}
                      value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#2b74e2] focus:bg-white outline-none transition-colors" 
                      placeholder="Mínimo de 8 caracteres"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full bg-[#2b74e2] hover:bg-blue-700 text-white font-semibold py-2 rounded-md text-sm transition-colors mt-2 disabled:opacity-50"
                  >
                    {isCreating ? 'A criar...' : 'Criar Conta de Acesso'}
                  </button>
                </form>
              </div>

              {/* Lista de Usuários */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h2 className="text-base font-bold text-[#1a2b3c]">Contas Autorizadas</h2>
                  <span className="bg-[#2b74e2]/10 text-[#2b74e2] text-xs font-bold px-2 py-1 rounded">
                    {usuarios.length} Ativas
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-5 py-3">E-mail de Acesso</th>
                        <th className="px-5 py-3">Data de Criação</th>
                        <th className="px-5 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {loadingUsuarios ? (
                        <tr><td colSpan={3} className="py-8 text-center text-slate-400">A carregar acessos...</td></tr>
                      ) : usuarios.length === 0 ? (
                        <tr><td colSpan={3} className="py-8 text-center text-slate-400">Nenhum acesso registado.</td></tr>
                      ) : (
                        usuarios.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 font-semibold text-slate-800">
                              {user.email}
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-500">
                              {new Date(user.created_at).toLocaleDateString('pt-BR')} às {new Date(user.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button 
                                onClick={() => handleExcluirUsuario(user.id, user.email)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                                title="Remover Acesso"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}