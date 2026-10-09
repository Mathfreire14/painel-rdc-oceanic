import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// A chave privada fica na variável de ambiente RD_PRIVATE_JWK (Vercel),
// nunca no código. Valor: o JSON completo da chave, em uma linha.
function carregarChave() {
  const bruto = process.env.RD_PRIVATE_JWK;
  if (!bruto) throw new Error('Variável RD_PRIVATE_JWK não configurada.');
  return JSON.parse(bruto);
}

// A RD grava cada caractere do texto em 1 byte. Lendo como UTF-8, os acentos
// viram "�". Lendo como latin1, os acentos voltam ao normal.
// Emojis e símbolos como • e “ ” chegam corrompidos da própria RD e não têm
// como ser recuperados.
function decodificar(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('latin1').decode(bytes);
  }
}

// Lê o JSON mesmo quando a RD manda aspas soltas dentro do texto das mensagens.
function lerHistorico(texto: string): unknown[] | null {
  const semControle = texto.replace(/[\u0000-\u001F]+/g, ' ');

  // 1. Leitura direta
  try {
    const lista = JSON.parse(semControle);
    return Array.isArray(lista) ? lista : [lista];
  } catch {}

  // 2. Conserta aspas soltas dentro do campo "content"
  const consertado = semControle.replace(
    /("content":")([\s\S]*?)(","to_department":)/g,
    (_, ini: string, conteudo: string, fim: string) =>
      ini +
      conteudo.replace(/\\"/g, '\u0001').replace(/"/g, '\\"').replace(/\u0001/g, '\\"') +
      fim
  );
  try {
    const lista = JSON.parse(consertado);
    return Array.isArray(lista) ? lista : [lista];
  } catch {}

  // 3. Mensagem por mensagem, descartando só as quebradas
  const pedacos = consertado
    .replace(/^\s*\[\s*\{/, '')
    .replace(/\}\s*\]\s*$/, '')
    .split(/\}\s*,\s*\{(?="sent_by")/);
  const lista: unknown[] = [];
  for (const p of pedacos) {
    try {
      lista.push(JSON.parse('{' + p + '}'));
    } catch {}
  }
  return lista.length ? lista : null;
}

export async function POST(request: NextRequest) {
  // Só aceita chamadas que tragam a senha combinada com o n8n
  const segredo = process.env.DESENCRIPTAR_SECRET;
  if (!segredo || request.headers.get('x-api-key') !== segredo) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const token = body.token || body.messages;

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido.' }, { status: 400 });
    }
    if (typeof token === 'object') {
      return NextResponse.json(token);
    }

    let texto = String(token).trim();

    if (texto.startsWith('eyJ')) {
      const chave = await jose.importJWK(carregarChave(), 'RSA-OAEP-256');
      const { plaintext } = await jose.compactDecrypt(texto, chave);
      texto = decodificar(plaintext);
    }

    const lista = lerHistorico(texto);
    if (lista) return NextResponse.json(lista);

    // Não conseguiu ler: devolve o texto bruto para o n8n tentar
    return NextResponse.json({ raw_text: texto });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro na API de desencriptação.', detalhe: err.message },
      { status: 500 }
    );
  }
}