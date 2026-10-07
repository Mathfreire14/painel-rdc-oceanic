import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

const PRIVATE_JWK = {
  "kty": "RSA",
  "kid": "JWYj-Rm_hDXGAD5g-Vmfw8dDTulx-wRqbeOgFN2IFlM",
  "use": "enc",
  "alg": "RSA-OAEP-256",
  "e": "AQAB",
  "n": "oN81Goi92XJm_gJj146l7THPrvFdbw5g5VzO-lTwQxITr1bi6WRF6abnCi_4M3jDFxJMP9CNa1Wqf0aJH6ZIx1MrnRRk2W6qoF9obtTRMSilI9my7QULXPK7oQeXPvGF-VdhB-GMkbR2QLQceqamkZH6_7PkDhVSMsofCpkFD-sPGNLElyVVNVF9vXj9jkFjqQ-stvSsZTq-oA9dO8KeEH9vFPfwi2mhyBJrZDFqoTPD1l7lHvl55bQAnZS9sajUxn7lG3Xa17MpPjpMMDjsXBbsKDWxOQcKYaYxiBbLC20jP7PS_5Q1Gn8I7U2Mp9aksp74zaPzNskm6D6h5XLovw",
  "d": "Ht_37ynDVhJw1dtbkilcixN-SpMkXYYi7qJLTxwyKI01nfdNAYIvMNLJkNj4B9jriGgInk7GdY0xdc_xzVM6sJazzif12w00TidBgdPyej7UwvarMnY_Yg1sGVG9o2TzU5GDm-Gb-vLppy1qMdf-K_4acCz0XgeViQ3lu0D3CcDDRttILbm1kEKu1rQ8lt7QyYwg9KgqnGVQUY2B6ValJufZufAh7sKJvf4yIDF2SDmBR8xWEZFnhsVTfGLbh5VLjDTeIjJu1G4Q3hcroAPKX8b3EueI1pgDqJpJevXP6Bkdi7EMlsUCRQUdlsceROXL9I5iAkjmfBuIHp3E5MqRYQ",
  "p": "2UUSwti7fhURgWGO_5wOH4S_ltdFTdzqk5zZA_a9R0pvWeaj9IhVV43wOkys1RMsAidcnYSBgL5sgSU82HWjqQ7jUc3oVeBZTIUEaf_a7904F8U_iNeYJU5EYhVl8EBG2Gu3a48npwf7HwMT1M2KcNimh5DEpGhJFj8MPlD5-cc",
  "q": "vYx2Y6lzvxHA64TsfUrpJcSNvqpgx-iqcHrkNwTGhQZbnsWDVAAOs_hvcwcUwVHz3IXnVcViLFumioxIRBx0zeZpQYC_2hCceLSmkEOsdaU6mrV10SUhWELYq4-Ga98djDnm0vzzBsPX1kv8o0u-cmjNCcpOn4GQymY83EMH2Uk",
  "dp": "n-PSI6vlhqqwgDswRfEs_4rsh3ASY3OQ-WJy3hTlRCKGAW3W-GygCVe-Etk8U23RdCBNauoJd5orNXsW5ODluNLo_NmAAjqg3MwC7JLKJrzwu6V_1Q97uvB3KItAwmY6_KeAitoFv0kDR9Y28OL134fAPYGPBMJuDr4FH5Lt8x8",
  "dq": "KtKO9JkV0zbZlNvk6bGA1s1_EHJBhyhjSSIaaOulRexXypjowJN6vuIDm8Mfx0USiOGfj9sWANt71pU2xlx_bvz9DpVdwpA6KXL2pmUDk1iO0uDoCyYOUHhZpvi376rqbAGwyj3nUcHxAzMLkoDMN-DBYdLYzGRjJ7bNTR2_qjE",
  "qi": "IS73vb4ieSryikfNkDIqrbQEeDE7hPtUwwTtM5-jHZnehSvp1zLH73RbloQ7phQZSP5NrM-B1WRvDXJ0stxemzLQKbJSpanwuGf17m-2pPTR4NheLS9EerrcU59KIsKhVUP5a727M7OChxaVh7fYRdig1W5oZrpjbyA8I6QyiBQ"
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