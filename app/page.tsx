import { createClient } from '@supabase/supabase-js';
import { connection } from 'next/server';

export default async function DashboardPage() {
  // Avisa ao Next.js 16/Turbopack que esta rota depende de conexão de dados em runtime
  await connection();

  let totalAtendimentos = 0;
  let totalEnviadas = 0;
  let totalRecebidas = 0;
  let operadores: any[] = [];
  let erroMsg: string | null = null;

  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.SUPABASE_URL || 
    '';

  const supabaseKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    '';

  if (!supabaseUrl || !supabaseKey) {
    erroMsg = 'Variáveis do Supabase ausentes na Vercel.';
  } else {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const [resVol, resOp] = await Promise.all([
        supabase.from('vw_volumetria_diaria').select('*'),
        supabase.from('vw_performance_operadores').select('*')
      ]);

      if (resVol.data && resVol.data.length > 0) {
        totalAtendimentos = resVol.data.reduce((acc: number, item: any) => acc + Number(item.total_atendimentos || 0), 0);
        totalEnviadas = resVol.data.reduce((acc: number, item: any) => acc + Number(item.total_enviadas || 0), 0);
        totalRecebidas = resVol.data.reduce((acc: number, item: any) => acc + Number(item.total_recebidas || 0), 0);
      }

      if (resOp.data) {
        operadores = resOp.data;
      }
    } catch (err: any) {
      erroMsg = `Erro na conexão: ${err.message || String(err)}`;
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <h1 style={{ color: '#1a202c', marginBottom: '8px' }}>Dashboard de Operações - Grupo Oceanic</h1>
      <p style={{ color: '#718096', marginBottom: '30px' }}>Acompanhamento de volumetria e performance dos operadores em tempo real.</p>

      {erroMsg && (
        <div style={{ padding: '15px', backgroundColor: '#fed7d7', color: '#9b2c2c', borderRadius: '8px', marginBottom: '20px', border: '1px solid #feb2b2' }}>
          <strong>Aviso:</strong> {erroMsg}
        </div>
      )}

      {/* CARDS DE KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '14px', color: '#718096' }}>Total de Atendimentos</span>
          <h2 style={{ fontSize: '28px', color: '#2b6cb0', margin: '10px 0 0 0' }}>{totalAtendimentos}</h2>
        </div>
        
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '14px', color: '#718096' }}>Mensagens Enviadas (Operadores)</span>
          <h2 style={{ fontSize: '28px', color: '#2f855a', margin: '10px 0 0 0' }}>{totalEnviadas}</h2>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '14px', color: '#718096' }}>Mensagens Recebidas</span>
          <h2 style={{ fontSize: '28px', color: '#c53030', margin: '10px 0 0 0' }}>{totalRecebidas}</h2>
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
            {operadores.length > 0 ? (
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
                <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
                  Nenhum registro de operador encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}