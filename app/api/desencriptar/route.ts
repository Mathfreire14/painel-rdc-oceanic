import { NextResponse } from 'next/server';
import * as jose from 'jose';

// 1. COLE A SUA CHAVE PRIVADA AQUI
const jwkChavePrivada = {
  "kty": "RSA",
  "kid": "ZlhQ0E-7U-bsY6-WyaU_FqKwQRmySoq7e3EDl-hZwhk",
  "use": "enc",
  "alg": "RSA-OAEP-256",
  "e": "AQAB",
  "n": "vqH9rJL56OzeEsyBZhxSfy6WRENv...", // <-- Substitua pelo seu
  "d": "KuQ0uNL68rr0vmMQDEL8FsyLF8...",
  "p": "3ai_B_aDkhhz8d0rDxb-5tA-zW...",
  "q": "3Cqz9nXpdIFjtRt0PyyOqEgE_C...",
  "dp": "CZ9Ss6jK62OuXNiKDvyjkieGIm...",
  "dq": "mI02ORWmd0WYMssdFxDmoA-W9K...",
  "qi": "oFEzk4f-OfCF3PAAAvwyU3fL82..."
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Removemos possíveis quebras de linha ou espaços que o n8n possa enviar por acidente
    const jweToken = body.token ? body.token.replace(/\s+/g, '') : null;
    const telefone = body.telefone;
    const id_cliente = body.id_cliente;

    if (!jweToken) {
      return NextResponse.json({ error: 'Token JWE não fornecido' }, { status: 400 });
    }

    // 2. Importa a chave JWK usando a biblioteca jose
    const privateKey = await jose.importJWK(jwkChavePrivada, 'RSA-OAEP-256');

    // 3. A biblioteca faz todo o trabalho de separar as 5 partes, validar o HMAC e usar AES-CBC
    const { plaintext } = await jose.compactDecrypt(jweToken, privateKey);
    
    // 4. Converte o resultado de bytes para uma string de texto legível
    const decryptedString = new TextDecoder().decode(plaintext);

    return NextResponse.json({ 
      success: true, 
      id_cliente: id_cliente,
      telefone: telefone,
      historico: JSON.parse(decryptedString) 
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na descriptografia JWE', detalhe: error.message }, { status: 500 });
  }
}