import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let token = body.token || body.messages;

    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 });
    }

    // Se já for um objeto/array JS processado
    if (typeof token === 'object') {
      return NextResponse.json(token);
    }

    let textoProcessado = String(token).trim();

    // Desencriptação JWE se começar por eyJ
    if (textoProcessado.startsWith('eyJ')) {
      try {
        const privateKey = await jose.importJWK(PRIVATE_JWK, 'RSA-OAEP-256');
        const { plaintext } = await jose.compactDecrypt(textoProcessado, privateKey);
        textoProcessado = new TextDecoder().decode(plaintext);
      } catch (e: any) {
        console.error('Erro na desencriptação JWE:', e.message);
      }
    }

    // Se após a desencriptação continuar a ser um objeto/array formatado como string
    if (typeof textoProcessado === 'string') {
      // Sanitização de quebras de linha e caracteres de controlo ASCII que quebram o JSON.parse
      const textoLimpo = textoProcessado
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
          if (match === '\n') return '\\n';
          if (match === '\r') return '\\r';
          if (match === '\t') return '\\t';
          return '';
        });

      try {
        const jsonParsed = JSON.parse(textoLimpo);
        return NextResponse.json(jsonParsed);
      } catch (errParse: any) {
        // Se ainda assim o parse falhar, devolve o texto bruto envolvido em estrutura válida
        return NextResponse.json({ raw_text: textoProcessado }, { status: 200 });
      }
    }

    return NextResponse.json(textoProcessado);

  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Erro na API de desencriptação', 
      detalhe: err.message 
    }, { status: 500 });
  }
}