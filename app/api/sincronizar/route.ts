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

    // A URL oficial descoberta na documentação!
    const rdUrl = 'https://api.tallos.com.br/v4/reports';
    
    const rdResponse = await fetch(rdUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${rdToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const textoPuro = await rdResponse.text();
    
    // Se o RD reclamar de alguma coisa (ex: pedir para informarmos a data do relatório)
    if (!rdResponse.ok) {
       return NextResponse.json({ 
         error: 'A API do RD Conversas respondeu, mas exige parâmetros adicionais', 
         status_http: rdResponse.status, 
         detalhes: textoPuro 
       }, { status: rdResponse.status });
    }

    const dadosRD = JSON.parse(textoPuro);

    return NextResponse.json({ 
      success: true, 
      message: 'Conexão com RD Conversas feita com sucesso!',
      amostra_dados: dadosRD 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Ocorreu uma falha no código', detalhe_do_erro: error.message || String(error) }, 
      { status: 500 }
    );
  }
}