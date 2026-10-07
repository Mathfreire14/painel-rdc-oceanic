import { NextResponse } from 'next/server';
import crypto from 'crypto';

// 1. COLE A SUA CHAVE PRIVADA AQUI
const jwkChavePrivada = {
  "kty": "RSA",
  "kid": "ZlhQ0E-7U-bsY6-WyaU_FqKwQRmySoq7e3EDl-hZwhk",
  "use": "enc",
  "alg": "RSA-OAEP-256",
  "e": "AQAB",
  "n": "vqH9rJL56OzeEsyBZhxSfy6WRENv...", // Substitua por tudo o que a RD lhe deu
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
    const jweToken = body.token;
    const telefone = body.telefone;
    const id_cliente = body.id_cliente;

    if (!jweToken) {
      return NextResponse.json({ error: 'Token JWE não fornecido' }, { status: 400 });
    }

    const privateKey = crypto.createPrivateKey({
      key: jwkChavePrivada,
      format: 'jwk'
    });

    const b64urlToBuffer = (str: string) => Buffer.from(str, 'base64url');

    const parts = jweToken.split('.');
    if (parts.length !== 5) throw new Error("Formato JWE inválido.");

    const [headerB64, encryptedKeyB64, ivB64, ciphertextB64, tagB64] = parts;

    // Desencripta a CEK
    const encryptedKey = b64urlToBuffer(encryptedKeyB64);
    const cek = crypto.privateDecrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    }, encryptedKey);

    // Desencripta as mensagens
    const iv = b64urlToBuffer(ivB64);
    const ciphertext = b64urlToBuffer(ciphertextB64);
    const tag = b64urlToBuffer(tagB64);

    const decipher = crypto.createDecipheriv('aes-256-gcm', cek, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    // Devolve o pacote completo e limpo para o n8n
    return NextResponse.json({ 
      success: true, 
      id_cliente: id_cliente,
      telefone: telefone,
      historico: JSON.parse(decrypted) 
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na descriptografia JWE', detalhe: error.message }, { status: 500 });
  }
}