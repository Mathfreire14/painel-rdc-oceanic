import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Conecta com o Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const rdToken = process.env.RD_API_TOKEN;

    if (!rdToken) {
      return NextResponse.json({ error: 'Token do RD Conversas não configurado.' }, { status: 500 });
    }

    // 2. Monta a requisição para a API do RD Conversas
    // NOTA: Vamos fazer uma requisição de teste para listar os dados recentes.
    // O endpoint exato pode variar na documentação, mas geralmente é algo como '/messages' ou '/reports'
    const rdUrl = 'https://api.rdstation.com.br/conversas/v2/messages'; // URL provável da API
    
    console.log("Iniciando busca no RD Conversas...");

    const rdResponse = await fetch(rdUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${rdToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // 3. Verifica se a chave foi aceite pelo RD
    if (!rdResponse.ok) {
       const erroTexto = await rdResponse.text();
       console.error("Erro ao buscar no RD:", erroTexto);
       return NextResponse.json({ error: 'Falha na comunicação com RD', detalhes: erroTexto }, { status: rdResponse.status });
    }

    // 4. Converte os dados que chegaram em formato JSON
    const dadosRD = await rdResponse.json();

    // Como é o nosso primeiro teste, vamos apenas imprimir os dados na tela
    // para vermos o formato exato em que o RD manda o ID do operador.
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conexão com RD Conversas feita com sucesso!',
      total_encontrado: dadosRD.length || 'Verifique a estrutura abaixo',
      amostra_dados: dadosRD // Mostra os dados na tela
    });

  } catch (error) {
    console.error('Erro geral no sistema:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}