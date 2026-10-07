import { NextResponse } from 'next/server';
import crypto from 'crypto';

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
    const jweToken = body.token;
    const telefone = body.telefone;
    const id_cliente = body.id_cliente;

    if (!jweToken) {
      return NextResponse.json({ error: 'Token JWE não fornecido', detalhes: "O body.token está vazio" }, { status: 400 });
    }

    const privateKey = crypto.createPrivateKey({
      key: jwkChavePrivada,
      format: 'jwk'
    });

    // Função melhorada: Converte Base64Url para Buffer, lidando com padding se necessário.
    const b64urlToBuffer = (str: string) => {
        let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) {
            b64 += '=';
        }
        return Buffer.from(b64, 'base64');
    };

    const parts = jweToken.split('.');
    if (parts.length !== 5) {
        throw new Error(`Formato JWE inválido. Esperadas 5 partes, recebidas ${parts.length}.`);
    }

    const [headerB64, encryptedKeyB64, ivB64, ciphertextB64, tagB64] = parts;

    let cek;
    try {
        // Desencripta a CEK (Chave Mestra)
        const encryptedKey = b64urlToBuffer(encryptedKeyB64);
        cek = crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
        }, encryptedKey);
    } catch (e: any) {
        throw new Error(`Erro ao desencriptar a chave CEK (RSA): ${e.message}`);
    }

    let decrypted;
    try {
        // Desencripta as mensagens (AES)
        const iv = b64urlToBuffer(ivB64);
        const ciphertext = b64urlToBuffer(ciphertextB64);
        const tag = b64urlToBuffer(tagB64);

        const decipher = crypto.createDecipheriv('aes-256-gcm', cek, iv);
        decipher.setAuthTag(tag);
        
        decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');
    } catch (e: any) {
        throw new Error(`Erro ao desencriptar o payload (AES-GCM): ${e.message}`);
    }

    // Tenta fazer o parse do JSON resultante
    let historicoParseado;
    try {
        historicoParseado = JSON.parse(decrypted);
    } catch (e: any) {
        throw new Error(`Payload desencriptado não é um JSON válido: ${e.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      id_cliente: id_cliente,
      telefone: telefone,
      historico: historicoParseado 
    });

  } catch (error: any) {
    // Retorna a mensagem de erro detalhada para vermos exatamente onde falhou
    return NextResponse.json({ error: 'Falha na descriptografia JWE', detalhe: error.message || String(error) }, { status: 500 });
  }
}