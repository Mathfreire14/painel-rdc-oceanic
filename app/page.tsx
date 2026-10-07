'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, Users, UserCheck, Bot, DollarSign, Calendar, Phone, 
  Building2, LogOut, ShieldCheck, UserPlus, Trash2, LayoutDashboard, UserX
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VolumetriaData {
  data: string;
  numero_whatsapp: string;
  setor: string;
  total_mensagens: number;
  mensagens_clientes: number;
  mensagens_bot: number;
  mensagens_humanas: number;
  mensagens_template: number;
}

interface OperadorData {
  operador_id: string;
  nome_operador: string;
  total_mensagens_enviadas: number;
  clientes_atendidos: number;
}

interface UserAuth {
  id: string;
  email: string;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState<'dashboard' | 'usuarios'>('dashboard');
  
  // Dashboard states
  const [volumetria, setVolumetria] = useState<VolumetriaData[]>([]);
  const [operadores, setOperadores] = useState<OperadorData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [diasFiltro, setDiasFiltro] = useState<number>(30);
  const [numeroSelecionado, setNumeroSelecionado] = useState<string>('TODOS');
  const [setorSelecionado, setSetorSelecionado] = useState<string>('TODOS');
  const [numerosDisponiveis, setNumerosDisponiveis] = useState<string[]>([]);
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([]);

  // Gestão de Utilizadores states
  const [listaUsuarios, setListaUsuarios] = useState<UserAuth[]>([]);
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [criandoUser, setCriandoUser] = useState(false);

  const TARIFA_SERVICO = 0.043;

  // Verificação de Sessão do Usuário
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // Carregar Indicadores do Dashboard
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          numero: numeroSelecionado,
          setor: setorSelecionado,
        });

        const [resVol, resOp] = await Promise.all([
          fetch(`/api/dashboard/volumetria?${queryParams.toString()}`),
          fetch('/api/dashboard/operadores')
        ]);

        if (resVol.ok) {
          const dataVol = await resVol.json();
          const lista = Array.isArray(dataVol) ? dataVol : [];
          
          const numUnicos = Array.from(new Set(lista.map((i: any) => i.numero_whatsapp))).filter(Boolean) as string[];
          const setUnicos = Array.from(new Set(lista.map((i: any) => i.setor))).filter(Boolean) as string[];

          if (numerosDisponiveis.length === 0 && numUnicos.length > 0) setNumerosDisponiveis(numUnicos);
          if (setoresDisponiveis.length === 0 && setUnicos.length > 0) setSetoresDisponiveis(setUnicos);

          setVolumetria(lista.slice(0, diasFiltro).reverse());
        }

        if (resOp.ok) {
          const dataOp = await resOp.json();
          setOperadores(Array.isArray(dataOp) ? dataOp : []);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    }

    if (abaAtiva === 'dashboard') loadDashboardData();
  }, [diasFiltro, numeroSelecionado, setorSelecionado, abaAtiva]);

  // Carregar Lista de Utilizadores
  const carregarUsuarios = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setListaUsuarios(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao carregar utilizadores:', e);
    }
  };

  useEffect(() => {
    if (abaAtiva === 'usuarios') carregarUsuarios();
  }, [abaAtiva]);

  // Handler para Criar Utilizador
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriandoUser(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: novoEmail, password: novaSenha }),
      });

      if (res.ok) {
        setNovoEmail('');
        setNovaSenha('');
        await carregarUsuarios();
      } else {
        alert('Erro ao criar utilizador.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCriandoUser(false);
    }
  };

  // Handler para Apagar Utilizador
  const handleDeletarUsuario = async (id: string) => {
    if (!confirm('Tem a certeza que deseja revogar o acesso deste utilizador?')) return;
    try {
      const res = await fetch(`/api/auth/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await carregarUsuarios();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Agregações
  const totalMensagens = volumetria.reduce((acc, curr) => acc + Number(curr.total_mensagens || 0), 0);
  const totalClientes = volumetria.reduce((acc, curr) => acc + Number(curr.mensagens_clientes || 0), 0);
  const totalHumanas = volumetria.reduce((acc, curr) => acc + Number(curr.mensagens_humanas || 0), 0);
  const totalTemplates = volumetria.reduce((acc, curr) => acc + Number(curr.mensagens_template || 0), 0);
  const custoEstimadoTotal = (totalHumanas + totalTemplates) * TARIFA_SERVICO;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Barra Superior e Navegação por Abas */}
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Painel RDC Oceanic</h1>
            <p className="text-sm text-slate-400">Monitoramento financeiro e gestão de acessos</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Navegação entre Abas */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 p-1">
              <button
                onClick={() => setAbaAtiva('dashboard')}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  abaAtiva === 'dashboard' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setAbaAtiva('usuarios')}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  abaAtiva === 'usuarios' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Acessos</span>
              </button>
            </div>

            {/* Botão de Sair */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 cursor-pointer transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* ABA 1: DASHBOARD DE INDICADORES */}
        {abaAtiva === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Filtros em Linha */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
                <Phone className="h-4 w-4 text-emerald-400" />
                <span>Número:</span>
                <select 
                  value={numeroSelecionado} 
                  onChange={(e) => setNumeroSelecionado(e.target.value)}
                  className="bg-transparent font-medium text-white focus:outline-none cursor-pointer"
                >
                  <option value="TODOS" className="bg-slate-900">Todos os números</option>
                  {numerosDisponiveis.map((num, idx) => (
                    <option key={idx} value={num} className="bg-slate-900">{num}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
                <Building2 className="h-4 w-4 text-blue-400" />
                <span>Setor:</span>
                <select 
                  value={setorSelecionado} 
                  onChange={(e) => setSetorSelecionado(e.target.value)}
                  className="bg-transparent font-medium text-white focus:outline-none cursor-pointer"
                >
                  <option value="TODOS" className="bg-slate-900">Todos os setores</option>
                  {setoresDisponiveis.map((set, idx) => (
                    <option key={idx} value={set} className="bg-slate-900">{set}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span>Período:</span>
                <select 
                  value={diasFiltro} 
                  onChange={(e) => setDiasFiltro(Number(e.target.value))}
                  className="bg-transparent font-medium text-white focus:outline-none cursor-pointer"
                >
                  <option value={7} className="bg-slate-900">Últimos 7 dias</option>
                  <option value={15} className="bg-slate-900">Últimos 15 dias</option>
                  <option value={30} className="bg-slate-900">Últimos 30 dias</option>
                </select>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Custo Est. Total</span>
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="mt-3 text-2xl font-bold text-emerald-400">R$ {custoEstimadoTotal.toFixed(2)}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Total Mensagens</span>
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-3 text-2xl font-bold">{totalMensagens}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Atend. Humano</span>
                  <UserCheck className="h-4 w-4 text-purple-400" />
                </div>
                <div className="mt-3 text-2xl font-bold">{totalHumanas}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Clientes Únicos</span>
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <div className="mt-3 text-2xl font-bold">{totalClientes}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Templates / Disparos</span>
                  <Bot className="h-4 w-4 text-amber-400" />
                </div>
                <div className="mt-3 text-2xl font-bold">{totalTemplates}</div>
              </div>
            </div>

            {/* Gráfico */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-6 text-lg font-semibold text-white">Evolução do Volume de Mensagens</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumetria}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="data" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }} />
                    <Area type="monotone" dataKey="total_mensagens" name="Total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: GESTÃO DE UTILIZADORES */}
        {abaAtiva === 'usuarios' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            
            {/* Formulário de Novo Utilizador */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm h-fit">
              <div className="flex items-center gap-2 text-white font-semibold mb-4">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                <h2>Criar Novo Acesso</h2>
              </div>

              <form onSubmit={handleCriarUsuario} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">E-mail do Utilizador</label>
                  <input
                    type="email"
                    required
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    placeholder="novo.usuario@empresa.com"
                    className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Palavra-passe de Acesso</label>
                  <input
                    type="password"
                    required
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full mt-1 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={criandoUser}
                  className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition cursor-pointer disabled:opacity-50"
                >
                  {criandoUser ? 'A criar...' : 'Cadastrar Utilizador'}
                </button>
              </form>
            </div>

            {/* Tabela de Utilizadores Cadastrados */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4">Utilizadores com Acesso ao Painel</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-900/80">
                    <tr>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3">Data de Criação</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {listaUsuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-medium text-slate-200">{u.email}</td>
                        <td className="px-4 py-3 text-xs">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeletarUsuario(u.id)}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
                            title="Revogar Acesso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}