'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Building2, Search, LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OperadorData {
  nome_operador: string;
  setor_exibicao: string;
  total_trocadas: number;
  enviadas_custo: number;
  recebidas_gratis: number;
  total_templates: number;
  total_bot: number;
}

const TARIFA_SERVICO = 0.043;
const TARIFA_TEMPLATE = 0.35;

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<OperadorData[]>([]);
  
  // Estados dos Filtros
  const [setorFiltro, setSetorFiltro] = useState('TODOS');
  const [buscaOperador, setBuscaOperador] = useState('');

  useEffect(() => {
    async function carregarDados() {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vw_performance_operadores')
        .select('*');

      if (error) {
        console.error('Erro ao buscar dados no Supabase:', error.message);
      } else if (data) {
        setDados(data);
      }
      
      setLoading(false);
    }
    carregarDados();
  }, []);

  // Aplicação dos Filtros Locais (Sem Canal)
  const dadosFiltrados = dados.filter(op => {
    const matchSetor = setorFiltro === 'TODOS' || op.setor_exibicao === setorFiltro;
    const matchBusca = op.nome_operador.toLowerCase().includes(buscaOperador.toLowerCase());
    return matchSetor && matchBusca;
  });

  // Cálculos de KPIs Globais
  const totalEnviadas = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.enviadas_custo || 0), 0);
  const totalRecebidas = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.recebidas_gratis || 0), 0);
  const totalTemplates = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.total_templates || 0), 0);
  const totalBot = dadosFiltrados.reduce((acc, curr) => acc + Number(curr.total_bot || 0), 0);
  
  const custoServico = totalEnviadas * TARIFA_SERVICO;
  const custoTemplate = totalTemplates * TARIFA_TEMPLATE;
  const custoTotal = custoServico + custoTemplate;

  // Lista dinâmica de setores para o Dropdown (ordenada alfabeticamente)
  const setoresUnicos = Array.from(new Set(dados.map(d => d.setor_exibicao))).filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-slate-800 font-sans p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2b3c]">Gestão de Consumo - API Meta / RD</h1>
            <p className="text-sm text-slate-500 mt-1">Monitoramento financeiro e volumétrico de atendimentos.</p>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); router.push('/login'); }}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-slate-50 shadow-sm transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>

        {/* Barra de Filtros (Estilo RD) - Apenas Setor e Busca */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              <Building2 className="h-4 w-4 text-[#2b74e2]" />
              <select 
                value={setorFiltro} onChange={(e) => setSetorFiltro(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="TODOS">Todos os Setores</option>
                {setoresUnicos.map((s, i) => <option key={i} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por atendente..."
              value={buscaOperador}
              onChange={(e) => setBuscaOperador(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-[#2b74e2] focus:bg-white outline-none transition-all"
            />
          </div>
        </div>

        {/* KPIs Executivos */}
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

        {/* Tabela Analítica */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-white">
            <h2 className="text-base font-bold text-[#1a2b3c]">Consumo Gerado por Atendente / IA</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Agente / Operador</th>
                  <th className="px-5 py-3">Setor</th>
                  <th className="px-5 py-3 text-center">Trocadas</th>
                  <th className="px-5 py-3 text-center">Enviadas (Custo)</th>
                  <th className="px-5 py-3 text-center">Recebidas (Grátis)</th>
                  <th className="px-5 py-3 text-right">Custo Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">Carregando métricas...</td></tr>
                ) : dadosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">Nenhum dado encontrado para os filtros.</td></tr>
                ) : (
                  dadosFiltrados.map((op, idx) => {
                    const custoLinha = (op.enviadas_custo * TARIFA_SERVICO) + (op.total_templates * TARIFA_TEMPLATE);
                    const isBot = op.nome_operador.includes('Automação') || op.nome_operador.includes('Bot');
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className={`px-5 py-3 font-bold ${isBot ? 'text-[#f1c21b]' : 'text-slate-900'}`}>
                          {op.nome_operador}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-block bg-slate-100 text-slate-600 rounded px-2 py-1 text-xs font-semibold">
                            {op.setor_exibicao}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center font-medium">{op.total_trocadas}</td>
                        <td className="px-5 py-3 text-center font-bold text-[#00c8b3]">{op.enviadas_custo}</td>
                        <td className="px-5 py-3 text-center font-medium text-[#8a3ffc]">{op.recebidas_gratis}</td>
                        <td className="px-5 py-3 text-right font-black text-[#2b74e2]">R$ {custoLinha.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}