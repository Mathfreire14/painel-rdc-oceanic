'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [volumetria, setVolumetria] = useState<any[]>([]);
  const [operadores, setOperadores] = useState<any[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      try {
        if (!supabaseUrl || !supabaseKey) {
          setErro('Variáveis do Supabase não configuradas no cliente.');
          setLoading(false);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const [resVol, resOp] = await Promise.all([
          supabase.from('vw_volumetria_diaria').select('*'),
          supabase.from('vw_performance_operadores').select('*')
        ]);

        if (resVol.data) setVolumetria(resVol.data);
        if (resOp.data) setOperadores(resOp.data);
      } catch (err: any) {
        setErro(err.message || 'Erro ao ligar ao Supabase');
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, []);

  const totalAtendimentos = volumetria.reduce((acc, item) => acc + Number(item.total_atendimentos || 0), 0);
  const totalEnviadas = volumetria.reduce((acc, item) => acc + Number(item.total_enviadas || 0), 0);
  const totalRecebidas = volumetria.reduce((acc, item) => acc + Number(item.total_recebidas || 0), 0);

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <h1 style={{ color: '#1a202c', marginBottom: '8px' }}>Dashboard de Operações - Grupo Oceanic</h1>
      <p style={{ color: '#718096', marginBottom: '30px' }}>Acompanhamento de volumetria e performance dos operadores em tempo real.</p>

      {erro && (
        <div style={{ padding: '15px', backgroundColor: '#fed7d7', color: '#9b2c2c', borderRadius: '8px', marginBottom: '20px' }}>
          {erro}
        </div>
      )}

      {/* CARDS DE KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '14px', color: '#718096' }}>Total de Atendimentos</span>
          <h2 style={{ fontSize: '28px', color: '#2b6cb0', margin: '10px 0 0 0' }}>{loading ? '...' : totalAtendimentos}</h2>
        </div>
        
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '14px', color: '#718096' }}>Mensagens Enviadas (Operadores)</span>
          <h2 style={{ fontSize: '28px', color: '#2f855a', margin: '10px 0 0 0' }}>{loading ? '...' : totalEnviadas}</h2>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '14px', color: '#718096' }}>Mensagens Recebidas</span>
          <h2 style={{ fontSize: '28px', color: '#c53030', margin: '10px 0 0 0' }}>{loading ? '...' : totalRecebidas}</h2>
        </div>
      </div>

      {/* TABELA DE PERFORMANCE POR OPERADOR */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>Desempenho por Operador</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #edf2f7', color: '#4a5568' }}>
              <th style={{ padding: '12px' }}>Operador</th>
              <th style={{ padding: '12px' }}>Total de Atendimentos</th>
              <th style={{ padding: '12px' }}>Mensagens Enviadas</th>
              <th style={{ padding: '12px' }}>Mensagens Recebidas</th>
              <th style={{ padding: '12px' }}>Taxa de Resposta (%)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>A carregar dados dos operadores...</td>
              </tr>
            ) : operadores.length > 0 ? (
              operadores.map((op: any) => (
                <tr key={op.operador_id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{op.operador_nome}</td>
                  <td style={{ padding: '12px' }}>{op.total_atendimentos}</td>
                  <td style={{ padding: '12px', color: '#2f855a', fontWeight: 'bold' }}>{op.mensagens_enviadas}</td>
                  <td style={{ padding: '12px', color: '#c53030' }}>{op.mensagens_recebidas}</td>
                  <td style={{ padding: '12px' }}>{op.percentual_respostas}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>Nenhum registo encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}