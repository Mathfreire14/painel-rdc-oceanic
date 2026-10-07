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

    const dataAtualBr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const dataSeteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    const startDate = dataSeteDiasAtras;
    const endDate = dataAtualBr;

    const rdUrl = `https://api.tallos.com.br/v4/reports?start_date=${startDate}&end_date=${endDate}&limit=50`;
    
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

    // 1. Extrai operadores únicos da lista de relatórios
    const operadoresMap = new Map();
    for (const item of relatorios) {
      if (item.employee?.id) {
        operadoresMap.set(item.employee.id, {
          id: item.employee.id,
          nome: item.employee.name,
          email: '', // Preenche com vazio para respeitar o schema
          ativo: true,
          data_criacao: new Date().toISOString()
        });
      }
    }

    // 2. Grava TODOS os operadores no Supabase e AGUARDA a conclusão total
    const listaOperadores = Array.from(operadoresMap.values());
    if (listaOperadores.length > 0) {
      const { error: errorOp } = await supabase.from('operadores').upsert(listaOperadores, { onConflict: 'id' });
      if (errorOp) {
        return NextResponse.json({ error: 'Erro ao salvar operadores', detalhe: errorOp }, { status: 500 });
      }
    }

    let registrosProcessados = 0;
    let errosSupabase: any[] = [];

    // 3. Grava as mensagens garantindo que os operadores já existem no banco
    for (const item of relatorios) {
      const idAtendimento = item.id;
      const operadorId = item.employee?.id || null;
      const telefoneCliente = item.customer?.cel_phone || '';
      const tipoMensagem = item.channel || 'whatsapp';
      const direcao = item.initiation_info?.initiated_by === 'customer' ? 'recebida' : 'enviada';
      
      let dataEnvio = new Date().toISOString();
      if (item.opened_at || item.created_at) {
        try {
          dataEnvio = new Date(item.opened_at || item.created_at).toISOString();
        } catch (e) {
          dataEnvio = new Date().toISOString();
        }
      }

      const payload = {
        id: idAtendimento,
        operador_id: operadorId,
        telefone_cliente: telefoneCliente,
        tipo_mensagem: tipoMensagem,
        direcao: direcao,
        data_envio: dataEnvio
      };

      const { error: errorMensagem } = await supabase.from('mensagens').upsert(payload, { onConflict: 'id' });

      if (!errorMensagem) {
        registrosProcessados++;
      } else {
        errosSupabase.push({
          id_atendimento: idAtendimento,
          payload_enviado: payload,
          erro: errorMensagem
        });
      }
    }

    return NextResponse.json({ 
      success: registrosProcessados > 0, 
      registros_processados: registrosProcessados,
      operadores_mapeados: listaOperadores.length,
      total_erros: errosSupabase.length,
      primeiro_erro: errosSupabase.length > 0 ? errosSupabase[0] : null
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro na sincronização', detalhe: error.message || String(error) }, 
      { status: 500 }
    );
  }
}