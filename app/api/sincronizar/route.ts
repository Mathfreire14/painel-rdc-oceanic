import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 1. Verifica se todas as chaves estão realmente carregadas na Vercel
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const rdToken = process.env.RD_API_TOKEN;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Chaves do Supabase estão faltando na Vercel.' }, { status: 500 });
    }
    if (!rdToken) {
      return NextResponse.json({ error: 'Token do RD Conversas está faltando na Vercel.' }, { status: 500 });
    }

    // Só conecta no Supabase depois de ter certeza que tem as chaves
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Tenta fazer a comunicação com o RD
    const rdUrl = 'https://api.conversas.rdstation.com/v2/messages';
    
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
       return NextResponse.json({ 
         error: 'A API do RD Conversas recusou o pedido', 
         status_http: rdResponse.status, 
         detalhes: erroTexto 
       }, { status: rdResponse.status });
    }

    // 3. Lê os dados de forma segura (evitando erro se o RD mandar um texto vazio)
    const textoPuro = await rdResponse.text();
    if (!textoPuro) {
        return NextResponse.json({ error: 'O RD Conversas respondeu, mas não mandou nenhum dado.' }, { status: 500 });
    }
    
    const dadosRD = JSON.parse(textoPuro);

    return NextResponse.json({ 
      success: true, 
      message: 'Conexão com RD Conversas feita com sucesso!',
      amostra_dados: dadosRD 
    });

  } catch (error: any) {
    // Se tropeçar em qualquer linha, mostra ONDE e PORQUE tropeçou
    return NextResponse.json(
      { error: 'Ocorreu uma falha no código', detalhe_do_erro: error.message || String(error) }, 
      { status: 500 }
    );
  }
}