import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const rdToken = process.env.RD_API_TOKEN;

    if (!rdToken) return NextResponse.json({ error: 'Token não configurado.' }, { status: 500 });

    const dataAtualBr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const dataSeteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    const rdUrl = `https://api.tallos.com.br/v4/reports?start_date=${dataSeteDiasAtras}&end_date=${dataAtualBr}&limit=50`;
    const rdResponse = await fetch(rdUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${rdToken}`, 'Content-Type': 'application/json' }
    });

    if (!rdResponse.ok) return NextResponse.json({ error: 'Erro na RD' }, { status: rdResponse.status });

    const dadosRD = await rdResponse.json();
    const relatorios = dadosRD.docs || [];

    // 1. Extrai Operadores (Cria o Bot/IA para atendimentos sem humano)
    const operadoresMap = new Map();
    for (const item of relatorios) {
      const empId = item.employee?.id || 'bot-ia';
      const empName = item.employee?.name || 'Bot / Inteligência Artificial';
      
      operadoresMap.set(empId, {
        id: empId,
        nome: empName,
        email: '', 
        ativo: true,
        data_criacao: new Date().toISOString()
      });
    }

    if (operadoresMap.size > 0) {
      await supabase.from('operadores').upsert(Array.from(operadoresMap.values()), { onConflict: 'id' });
    }

    let registrosProcessados = 0;

    // 2. Processa Atendimentos
    for (const item of relatorios) {
      const empId = item.employee?.id || 'bot-ia';
      const dataEnvio = item.opened_at || item.created_at || new Date().toISOString();

      const payload = {
        id: item.id,
        operador_id: empId,
        telefone_cliente: item.customer?.cel_phone || '',
        tipo_mensagem: item.channel || 'whatsapp',
        direcao: 'recebida', // Simplificado
        data_envio: new Date(dataEnvio).toISOString(),
        is_template: false, // Suprimido
        categoria_meta: 'servico',
        qtd_enviadas: item.total_send_messages || 0,
        qtd_recebidas: item.total_receive_messages || 0
      };

      const { error } = await supabase.from('mensagens').upsert(payload, { onConflict: 'id' });
      if (!error) registrosProcessados++;
    }

    return NextResponse.json({ success: true, registros_processados: registrosProcessados });

  } catch (error: any) {
    return NextResponse.json({ error: 'Erro', detalhe: error.message }, { status: 500 });
  }
}