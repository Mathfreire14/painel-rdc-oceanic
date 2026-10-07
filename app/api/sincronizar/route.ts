import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rdToken = process.env.RD_API_TOKEN;

    if (!supabaseUrl || !supabaseKey || !rdToken) {
      return NextResponse.json({ error: 'Chaves faltando na Vercel.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Pega a data atual no formato simples YYYY-MM-DD (fuso local)
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    
    const dataFormatada = `${ano}-${mes}-${dia}`;

    // 2. Monta a URL passando o dia de hoje nos dois parâmetros
    const rdUrl = `https://api.tallos.com.br/v4/reports?start_date=${dataFormatada}&end_date=${dataFormatada}`;
    
    console.log(`Buscando relatórios para a data: ${dataFormatada}...`);

    const rdResponse = await fetch(rdUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${rdToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const textoPuro = await rdResponse.text();

    if (!rdResponse.ok) {
       return NextResponse.json({ 
         error: 'A API do RD Conversas retornou erro', 
         status_http: rdResponse.status, 
         detalhes: textoPuro 
       }, { status: rdResponse.status });
    }

    const dadosRD = JSON.parse(textoPuro);

    return NextResponse.json({ 
      success: true, 
      data_consultada: dataFormatada,
      total_registros: Array.isArray(dadosRD) ? dadosRD.length : 'Estrutura de objeto',
      amostra_dados: dadosRD 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Ocorreu uma falha no código', detalhe_do_erro: error.message || String(error) }, 
      { status: 500 }
    );
  }
}