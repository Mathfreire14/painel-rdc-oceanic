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

    // 1. Calcula as datas automaticamente (Início do dia de hoje até o momento atual)
    const agora = new Date();
    const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    // Formato exigido pela API (YYYY-MM-DDTHH:mm:ss.sssZ ou YYYY-MM-DD)
    const startDate = inicioDoDia.toISOString();
    const endDate = agora.toISOString();

    // 2. Monta a URL com os parâmetros de data exigidos pela API
    const rdUrl = `https://api.tallos.com.br/v4/reports?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    
    console.log(`Buscando relatórios de ${startDate} até ${endDate}...`);

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
      periodo_consultado: { startDate, endDate },
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