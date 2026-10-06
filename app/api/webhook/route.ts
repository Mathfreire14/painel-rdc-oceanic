import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. Conecta com o Supabase usando as chaves do seu .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Cria a função que vai RECEBER os dados do RD Conversas (POST)
export async function POST(request: Request) {
  try {
    // Lê o pacote de dados (JSON) que o RD Conversas enviou
    const body = await request.json();
    
    // Imprime no painel para podermos ver o formato exato que o RD está enviando
    console.log("Chegou um novo evento do RD:", body);

    // Como o RD Conversas possui vários eventos, vamos garantir que só lemos envio de mensagens
    // (Ajustaremos os nomes exatos dos campos na próxima etapa, quando testarmos)
    
    // Retorna um "OK" para o RD Conversas saber que recebemos com sucesso
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook recebido e processado!' 
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao processar o webhook:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Falha interna no servidor' 
    }, { status: 500 });
  }
}