import { NextResponse } from 'next/server';
import * as jose from 'jose';

// 1. COLE A SUA CHAVE PRIVADA AQUI
const jwkChavePrivada = {{  "kty": "RSA",  "kid": "ZlhQ0E-7U-bsY6-WyaU_FqKwQRmySoq7e3EDl-hZwhk",  "use": "enc",  "alg": "RSA-OAEP-256",  "e": "AQAB",  "n": "vqH9rJL56OzeEsyBZhxSfy6WRENvjzMzjoyV1lDt1aXi5j_dlCJAx0FfcL5M_JYDsQGjFLxuiXIM5m1nJagd5U7yTyUW6Tli_1DanOm9bd0v1nlX3JY4pHW-o67PuEWQl-PuEUIYHaLplbA1wkqfmhgsmz_RtEENwbgrh3AGzSpf-r0bOHG_ctc7OwX5Ftq1dFWhmRsBqdLmAVrYNkRsMw0Z0WVXbU5m4vljHdI5qB_6ICk6KJ6oeGat5n8P8qHXDFCl7Kh1evnkrnKHMtjknXij3TrIax2WKAIF1byskrDr3ZDflDVibxVX6pJDy2iOkPv7O_Atp4PYFXzN-4-1EQ",  "d": "KuQ0uNL68rr0vmMQDEL8FsyLF8HahGw_QegEwItF7-ealTayaqWIUKy3Rh0zIjO4kedt43kAH-Gu4FumNRVN4K2yHDean4__Y7Wz8lEvA1ycalOz_pg4F1y8r4RiDTJttZcdlfl6hpSEnN7gQZ5bqaadxrKFwtpON5NyC8-bYCawt69Xqlm3o29h0szZy6AUrOuA4ZhtsSb0SYOf5vMwrcp9L8uN2ZZ9qgkSMSHyBmbzwrmfwY7me_nODId2GjV5HdYyhEsu8z2rM2FYojeXC0c9S_44gVeV6gsex71qkFvoQiwbJWeoYRDeBPCrAUiPHhuAijSpQTiXYtN2oZ4lLw",  "p": "3ai_B_aDkhhz8d0rDxb-5tA-zWH3o-i8x8uEFLwItFIeWntXfDMaNgmGlssshIhQDd3O2ATyKg93oNmP_WDJPWMf6aJa-yoDq5wsh6OM8wFL-JI6cLPoK-hMfw5rOj9VhRYLUadPNZp2CtVQcYhrLMQhJXazKb8cBk_xLkAHXlM",  "q": "3Cqz9nXpdIFjtRt0PyyOqEgE_C3hFbHvqff_7-vBujSTetUd5UbsedOuL9wjHRYA5WX_ZvQ0mubd_AWkWPdvG5ZC3PkQ5D0JqOuVRzDqyStbNphunwab0NfCFOraaahXO5VQvGsnRCAdAOw0B17aep-2q0Z2kYRJN-jBsAQWyos",  "dp": "CZ9Ss6jK62OuXNiKDvyjkieGImpXUsE-uLmoATJsek96S9lA4f5h6-ib9B3bz-EPAJsZaJ1GWfcT7WKkco5qDgUolH7czjxzrlZ4RGcgLkhnIOJQMSZONOG_uGBK3Vt0ffOICEJoGN6cszmxZUxTwry856BwhKZsNAXyZVyYNUs",  "dq": "mI02ORWmd0WYMssdFxDmoA-W9K1NgtzR9XGTc0hl6YG4lqnIly83d4qG7T6ZTfQLFug_ubSIJrTFJ3U5VTPNVs4c8kPZwmvQn6zsuHFanZ1fDEs-iw3nNSPqpNe-EuvD1dM2J_gPMxMVRahkvJ6qv8Cer7qZOWbx3L14R1_t8tU",  "qi": "oFEzk4f-OfCF3PAAAvwyU3fL82FMaFu32_GTl3e9gGEfSswpd1q-aWKz03YvEJU8LZzSHbtD7fBqTmzra81VMjA_a1QBl1UBVX0JzYcpq_mHHTYPGUTh-R9wC0CYuqdj57Ehgu1tQBFqscKwYa3ftkN-9jylYHPxSdgoHb88Z6U"};

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