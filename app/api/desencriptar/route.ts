import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// Chave JWK Privada fictícia para desencriptação RSA-OAEP-256
const PRIVATE_JWK = {
  kty: "RSA",
  kid: "ZlhQ0E-7U-bsY6-WyaU_FqKwQRmySoq7e3EDl-hZwhk",
  use: "enc",
  alg: "RSA-OAEP-256",
  e: "AQAB",
  n: "vqH9rJL56OzeEsyBZhxSfy6WRENvjzMzjoyV1lDt1aXi5j_dlCJAx0FfcL5M_JYDsQGjFLxuiXIM5m1nJagd5U7yTyUW6Tli_1DanOm9bd0v1nlX3JY4pHW-o67PuEWQl-PuEUIYHaLplbA1wkqfmhgsmz_RtEENwbgrh3AGzSpf-r0bOHG_ctc7OwX5Ftq1dFWhmRsBqdLmAVrYNkRsMw0Z0WVXbU5m4vljHdI5qB_6ICk6KJ6oeGat5n8P8qHXDFCl7Kh1evnkrnKHMtjknXij3TrIax2WKAIF1byskrDr3ZDflDVibxVX6pJDy2iOkPv7O_Atp4PYFXzN-4-1EQ",
  d: "KuQ0uNL68rr0vmMQDEL8FsyLF8HahGw_QegEwItF7-ealTayaqWIUKy3Rh0zIjO4kedt43kAH-Gu4FumNRVN4K2yHDean4__Y7Wz8lEvA1ycalOz_pg4F1y8r4RiDTJttZcdlfl6hpSEnN7gQZ5bqaadxrKFwtpON5NyC8-bYCawt69Xqlm3o29h0szZy6AUrOuA4ZhtsSb0SYOf5vMwrcp9L8uN2ZZ9qgkSMSHyBmbzwrmfwY7me_nODId2GjV5HdYyhEsu8z2rM2FYojeXC0c9S_44gVeV6gsex71qkFvoQiwbJWeoYRDeBPCrAUiPHhuAijSpQTiXYtN2oZ4lLw",
  p: "3ai_B_aDkhhz8d0rDxb-5tA-zWH3o-i8x8uEFLwItFIeWntXfDMaNgmGlssshIhQDd3O2ATyKg93oNmP_WDJPWMf6aJa-yoDq5wsh6OM8wFL-JI6cLPoK-hMfw5rOj9VhRYLUadPNZp2CtVQcYhrLMQhJXazKb8cBk_xLkAHXlM",
  q: "3Cqz9nXpdIFjtRt0PyyOqEgE_C3hFbHvqff_7-vBujSTetUd5UbsedOuL9wjHRYA5WX_ZvQ0mubd_AWkWPdvG5ZC3PkQ5D0JqOuVRzDqyStbNphunwab0NfCFOraaahXO5VQvGsnRCAdAOw0B17aep-2q0Z2kYRJN-jBsAQWyos",
  dp: "CZ9Ss6jK62OuXNiKDvyjkieGImpXUsE-uLmoATJsek96S9lA4f5h6-ib9B3bz-EPAJsZaJ1GWfcT7WKkco5qDgUolH7czjxzrlZ4RGcgLkhnIOJQMSZONOG_uGBK3Vt0ffOICEJoGN6cszmxZUxTwry856BwhKZsNAXyZVyYNUs",
  dq: "mI02ORWmd0WYMssdFxDmoA-W9K1NgtzR9XGTc0hl6YG4lqnIly83d4qG7T6ZTfQLFug_ubSIJrTFJ3U5VTPNVs4c8kPZwmvQn6zsuHFanZ1fDEs-iw3nNSPqpNe-EuvD1dM2J_gPMxMVRahkvJ6qv8Cer7qZOWbx3L14R1_t8tU",
  qi: "oFEzk4f-OfCF3PAAAvwyU3fL82FMaFu32_GTl3e9gGEfSswpd1q-aWKz03YvEJU8LZzSHbtD7fBqTmzra81VMjA_a1QBl1UBVX0JzYcpq_mHHTYPGUTh-R9wC0CYuqdj57Ehgu1tQBFqscKwYa3ftkN-9jylYHPxSdgoHb88Z6U"
};

/**
 * Função utilitária para sanitizar strings JSON que contêm caracteres de controle não escapados 
 * ou quebras de linha brutas enviadas pela API da RD Conversas.
 */
function sanitizarJsonString(rawStr: string): string {
  if (!rawStr) return '';
  return rawStr
    // Substitui quebras de linha reais dentro dos valores por \n sanitizado
    .replace(/\r?\n/g, '\\n')
    // Substitui tabulações
    .replace(/\t/g, '\\t')
    // Remove caracteres de controle ASCII não imprimíveis (0x00-0x1F) mantendo unicode
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token || body.messages;

    if (!token) {
      return NextResponse.json(
        { error: 'Token JWE não fornecido no corpo da requisição.' }, 
        { status: 400 }
      );
    }

    // Se a entrada já for um array/objeto estruturado (sem encriptação)
    if (typeof token === 'object') {
      return NextResponse.json(token);
    }

    let payloadDesencriptado = '';

    // Tenta desencriptar caso venha como uma string JWE (ex: eyJhbGci...)
    if (typeof token === 'string' && token.startsWith('eyJ')) {
      try {
        const privateKey = await jose.importJWK(PRIVATE_JWK, 'RSA-OAEP-256');
        const { plaintext } = await jose.compactDecrypt(token, privateKey);
        payloadDesencriptado = new TextDecoder().decode(plaintext);
      } catch (decryptErr: any) {
        console.warn('Payload não pôde ser desencriptado via JWE (tentando parse direto):', decryptErr.message);
        payloadDesencriptado = token;
      }
    } else {
      payloadDesencriptado = token;
    }

    // Processamento e sanitização de segurança antes de efetuar o parse JSON
    try {
      // 1. Tenta parse direto
      const parsed = JSON.parse(payloadDesencriptado);
      return NextResponse.json(parsed);
    } catch (parseErrorFirst: any) {
      console.warn('Primeira tentativa de parse falhou, aplicando sanitização de caracteres...');

      // 2. Tenta parse sanitizado
      const textoSanitizado = sanitizarJsonString(payloadDesencriptado);
      const parsedSanitizado = JSON.parse(textoSanitizado);
      return NextResponse.json(parsedSanitizado);
    }

  } catch (err: any) {
    console.error('Erro crítico no endpoint de desencriptação:', err);
    return NextResponse.json({ 
      error: 'A API da RD enviou caracteres inválidos', 
      detalhe: err.message 
    }, { status: 500 });
  }
}