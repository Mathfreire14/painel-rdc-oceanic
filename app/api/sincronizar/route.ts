import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Conecta com o Supabase usando as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    // Puxa a chave do RD Conversas
    const rdToken = process.env.RD_API_TOKEN;

    if (!rdToken) {
      return NextResponse.json(
        { error: 'Token do RD Conversas não configurado.' }, 
        { status: 500 }
      );
    }

    // 2. URL atualizada para a API V2 do RD Conversas
    const rdUrl = 'https://api.conversas.rdstation.com/v2/messages';
    
    console.log("Iniciando busca no RD Conversas com a nova URL...");

    const rdResponse = await fetch(rdUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${rdToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // 3. Verifica se a requisição foi bem-sucedida
    if (!rdResponse.ok) {
       const erroTexto = await rdResponse.text();
       console.error("Erro retornado pelo RD:", erroTexto);
       return NextResponse.json(
         { error: 'Falha na comunicação com RD', status_http: rdResponse.status, detalhes: erroTexto }, 
         { status: rdResponse.status }
       );
    }

    // 4. Converte a resposta com sucesso para JSON
    const dadosRD = await rdResponse.json();

    // Exibe os dados na tela para mapearmos os campos do operador
    return NextResponse.json({ 
      success: true, 
      message: 'Conexão com RD Conversas feita com sucesso!',
      total_encontrado: dadosRD.length || 'Os dados não vieram em formato de lista pura. Veja a estrutura abaixo.',
      amostra_dados: dadosRD 
    });

  } catch (error) {
    console.error('Erro geral no sistema:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' }, 
      { status: 500 }
    );
  }
}