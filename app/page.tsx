import { createClient } from '@supabase/supabase-js';

export const instant = false;

export default async function DashboardPage() {
  let custoTotalReais = 0;
  let totalMsgsServico = 0;
  let totalTemplates = 0;
  let dadosCategorias: any[] = [];
  let dadosOperadores: any[] = [];
  let erroMsg: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    erroMsg = 'Variáveis do Supabase ausentes na Vercel.';
  } else {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const [resCat, resOp] = await Promise.all([
        supabase.from('vw_custo_categoria_diario').select('*'),
        supabase.from('vw_custo_por_operador').select('*')
      ]);

      if (resCat.data) {
        dadosCategorias = resCat.data;
        custoTotalReais = resCat.data.reduce((acc: number, item: any) => acc + Number(item.custo_estimado_reais || 0), 0);
        
        const servicoItem = resCat.data.find((i: any) => i.categoria_meta === 'servico');
        const marketingItem = resCat.data.find((i: any) => i.categoria_meta === 'marketing');
        
        totalMsgsServico = servicoItem ? Number(servicoItem.total_mensagens || 0) : 0;
        totalTemplates = marketingItem ? Number(marketingItem.total_mensagens || 0) : 0;
      }

      if (resOp.data) {
        dadosOperadores = resOp.data;
      }
    } catch (err: any) {
      erroMsg = `Erro na conexão: ${err.message || String(err)}`;
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ color: '#1a202c', margin: 0 }}>Gestão de Consumo & Custos - API Meta / RD</h1>
          <p style={{ color: '#718096', margin: '5px 0 0 0' }}>Acompanhamento de Mensagens de Serviço (R$ 0,043), Marketing (R$ 0,394) e Utilidade em tempo real.</p>
        </div>
      </div>

      {erroMsg && (
        <div style={{ padding: '15px', backgroundColor: '#fed7d7', color: '#9b2c2c', borderRadius: '8px', marginBottom: '20px', border: '1px solid #feb2b2' }}>
          <strong>Aviso:</strong> {erroMsg}
        </div>
      )}

      {/* CARDS DE KPIS FINANCEIROS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #2b6cb0' }}>
          <span style={{ fontSize: '13px', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>Custo Total Estimado</span>
          <h2 style={{ fontSize: '28px', color: '#2b6cb0', margin: '8px 0 0 0' }}>
            R$ {custoTotalReais.toFixed(2)}
          </h2>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #2f855a' }}>
          <span style={{ fontSize: '13px', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>Msgs de Serviço (Atendimento)</span>
          <h2 style={{ fontSize: '28px', color: '#2f855a', margin: '8px 0 0 0' }}>{totalMsgsServico}</h2>
          <span style={{ fontSize: '12px', color: '#a0aec0' }}>Tarifa: R$ 0,043 / msg</span>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #dd6b20' }}>
          <span style={{ fontSize: '13px', color: '#718096', fontWeight: 'bold', textTransform: 'uppercase' }}>Templates / Disparos Ativos</span>
          <h2 style={{ fontSize: '28px', color: '#dd6b20', margin: '8px 0 0 0' }}>{totalTemplates}</h2>
          <span style={{ fontSize: '12px', color: '#a0aec0' }}>Tarifa Marketing: R$ 0,394 / msg</span>
        </div>
      </div>

      {/* TABELA DE EFICIÊNCIA E CUSTO POR OPERADOR */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>Consumo e Custo Gerado por Operador</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #edf2f7', color: '#4a5568' }}>
              <th style={{ padding: '12px' }}>Operador</th>
              <th style={{ padding: '12px' }}>Total Msgs Processadas</th>
              <th style={{ padding: '12px' }}>Msgs Serviço (Texto Livre)</th>
              <th style={{ padding: '12px' }}>Templates Enviados</th>
              <th style={{ padding: '12px' }}>Custo Estimado Gerado (R$)</th>
            </tr>
          </thead>
          <tbody>
            {dadosOperadores.length > 0 ? (
              dadosOperadores.map((op: any) => (
                <tr key={op.operador_id} style={{ borderBottom: '1px solid #edf2f7' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{op.operador_nome}</td>
                  <td style={{ padding: '12px' }}>{op.total_mensagens_processadas}</td>
                  <td style={{ padding: '12px', color: '#2f855a', fontWeight: 'bold' }}>{op.msgs_servico_enviadas}</td>
                  <td style={{ padding: '12px', color: '#dd6b20', fontWeight: 'bold' }}>{op.templates_enviados}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: '#2b6cb0' }}>
                    R$ {Number(op.custo_gerado_reais || 0).toFixed(2)}
                  </td>
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