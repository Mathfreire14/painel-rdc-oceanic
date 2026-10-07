'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Users, UserCheck, Bot } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VolumetriaData {
  data: string;
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

export default function Dashboard() {
  const [volumetria, setVolumetria] = useState<VolumetriaData[]>([]);
  const [operadores, setOperadores] = useState<OperadorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [resVol, resOp] = await Promise.all([
          fetch('/api/dashboard/volumetria'),
          fetch('/api/dashboard/operadores')
        ]);

        if (resVol.ok) {
          const dataVol = await resVol.json();
          setVolumetria(Array.isArray(dataVol) ? dataVol.reverse() : []);
        }

        if (resOp.ok) {
          const dataOp = await resOp.json();
          setOperadores(Array.isArray(dataOp) ? dataOp : []);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalMensagens = volumetria.reduce((acc, curr) => acc + Number(curr.total_mensagens || 0), 0);
  const totalClientes = volumetria.reduce((acc, curr) => acc + Number(curr.mensagens_clientes || 0), 0);
  const totalHumanas = volumetria.reduce((acc, curr) => acc + Number(curr.mensagens_humanas || 0), 0);
  const totalBot = volumetria.reduce((acc, curr) => acc + Number(curr.mensagens_bot || 0), 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span>A carregar métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Painel RDC Oceanic</h1>
            <p className="text-sm text-slate-400">Monitoramento de conversas e volumetria do WhatsApp</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Dados em Tempo Real
          </div>
        </div>

        {/* Cards KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Mensagens</span>
              <MessageSquare className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3 text-2xl font-bold">{totalMensagens}</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Mensagens Clientes</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-3 text-2xl font-bold">{totalClientes}</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Atendimento Humano</span>
              <UserCheck className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-3 text-2xl font-bold">{totalHumanas}</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Mensagens do Bot</span>
              <Bot className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 text-2xl font-bold">{totalBot}</div>
          </div>
        </div>

        {/* Gráfico de Volumetria */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h2 className="mb-6 text-lg font-semibold text-white">Volumetria Diária</h2>
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem' }} 
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="total_mensagens" name="Total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Agentes/Operadores */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-lg font-semibold text-white">Consumo por Agente / Operador</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-400 bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3">Agente / Operador</th>
                  <th className="px-4 py-3">ID Operador</th>
                  <th className="px-4 py-3">Mensagens Enviadas</th>
                  <th className="px-4 py-3">Clientes Atendidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {operadores.map((op, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-200">
                      {op.nome_operador || 'Não identificado'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {op.operador_id}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">
                      {op.total_mensagens_enviadas}
                    </td>
                    <td className="px-4 py-3">
                      {op.clientes_atendidos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}