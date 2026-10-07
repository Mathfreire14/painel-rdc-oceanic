import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const rdToken = process.env.RD_API_TOKEN;

    if (!rdToken) {
      return NextResponse.json({ error: 'Token do RD Conversas não configurado.' }, { status: 500 });
    }

    // 1. Define o período no fuso do Brasil (últimos 7 dias até hoje)
    const dataAtualBr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const dataSeteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    const startDate = dataSeteDiasAtras;
    const endDate = dataAtualBr;

    // 2. Busca na API do RD Conversas / Tallos
    const rdUrl = `https://api.tallos.com.br/v4/reports?start_date=${startDate}&end_date=${endDate}&limit=100`;
    
    const rdResponse = await fetch(rdUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${rdToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!rdResponse.ok) {
       const erroTexto = await rdResponse.text();
       return NextResponse.json({ error: 'Erro ao consultar RD', detalhes: erroTexto }, { status: rdResponse.status });
    }

    const dadosRD = await rdResponse.json();
    const relatorios = dadosRD.docs || [];

    let operadoresInseridos = 0;
    let registrosProcessados = 0;

    // 3. Processa e grava cada atendimento no Supabase
    for (const item of relatorios) {
      if (item.employee?.id) {
        // Atualiza ou insere o Operador na tabela de operadores
        await supabase.from('operadores').upsert({
          id: item.employee.id,
          nome: item.employee.name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        operadoresInseridos++;
      }

      // Prepara os dados para salvar na tabela de mensagens / atendimentos
      const idAtendimento = item.id;
      const operadorId = item.employee?.id || null;
      const enviadas = item.total_send_messages || 0;
      const recebidas = item.total_receive_messages || 0;
      const iniciadoPor = item.initiation_info?.initiated_by || 'desconhecido';
      const dataCriacao = item.opened_at || item.created_at;

      // Grava a métrica no banco
      await supabase.from('mensagens').upsert({
        id: idAtendimento,
        operador_id: operadorId,
        mensagens_enviadas: enviadas,
        mensagens_recebidas: recebidas,
        iniciado_por: iniciadoPor,
        tabulacao: item.to_tabulation || '',
        departamento: item.to_department || '',
        criado_em: dataCriacao
      }, { onConflict: 'id' });

      registrosProcessados++;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sincronização concluída com sucesso!',
      periodo: { startDate, endDate },
      total_encontrado: dadosRD.total || relatorios.length,
      registros_processados: registrosProcessados,
      operadores_mapeados: operadoresInseridos
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro na sincronização', detalhe: error.message || String(error) }, 
      { status: 500 }
    );
  }
}