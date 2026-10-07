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

    // 1. Calcula as datas no fuso do Brasil (America/Sao_Paulo)
    const dataAtualBr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // Formato YYYY-MM-DD
    
    // Para garantirmos que virão dados de teste, vamos buscar dos últimos 7 dias até hoje
    const dataSeteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    const startDate = dataSeteDiasAtras;
    const endDate = dataAtualBr;

    // 2. Monta a URL da API da Tallos/RD
    const rdUrl = `https://api.tallos.com.br/v4/reports?start_date=${startDate}&end_date=${endDate}&limit=50`;
    
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
      total_encontrado: dadosRD.total || 0,
      amostra_dados: dadosRD.docs || dadosRD 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Ocorreu uma falha no código', detalhe_do_erro: error.message || String(error) }, 
      { status: 500 }
    );
  }
}