import { NextResponse } from 'next/server';
import * as jose from 'jose';

// 1. COLE A SUA CHAVE PRIVADA AQUI
const jwkChavePrivada = {
  "kty": "RSA",
  "kid": "KD2u4yB-JagUKzlhwITLObIIgfLd8jNluKEAvEE9wrc",
  "use": "enc",
  "alg": "RSA-OAEP-256",
  "e": "AQAB",
  "n": "yRJSHPChipVtPKhqF_G1y4o8TkBPfd_nMsj7dDFNl9WfFiksl2Bt9IXfNvJog4E7_gSrEJd3iy1bjev0O_ANVzquDaXznCOlTOnv5fw3UD9fwg_D9TKHiPCddL3nLksZWIR74W7jXSe0ZyLe8HAUjtlIWWmd4e2gVdU7hycnaOQjgVRBLg7_NDdpkayhzITf-p5RDf5cqHGpz4_KgeJdYuW2emUizyQZGGQBhLfecNuosWien5ZFsjOZ2JqV_vdVxu1_gLx0LRMNna9Xw4nNJzSEp3Z770HJQLTg5m_Ii4jCT0JQ7ieIx8aYD0qU2AFmc-Jp1NSeEUJApHwTZ0kW9w",
  "d": "MSjYiJjQdgh4j6cBYV9IOj5O5jbU-IqAhSscR1kyhlfFMG7apxv9ZhZA77culFBJcZ6EkGbn5FAvnTA-I1VafaQsH8weFmOkq3xamdkjUOxdph2ipFU5S-LALGWtmuTjin_Bpektj34AnmKpLRHKBO7cwHeREUa-t52Nk0qgWQVWx4JC3TNSk2ofVOXzMaT9MPSYRoG-fnmvHZCtfRKLpLNNfyZecXh8xRyk_Eco3cfvPuWuY_stj7Yt5n2aNNuOy-S2FO1VlTpPx0_UP0fOMws4gfM9Mf-rOCJZnAZSZUCit8KjzYeHnPYK1sY_JcUoB3nqMcqvxwdCyZtne14P8Q",
  "p": "954fQYQscsLTX1tE7LJxBnzjD50COgMJUmTvSlgfDNj_0FUwJlomS_gTXRQU_hY3GYhc6ospTgSQ46mYTr6cffsmk8DC4113BxDt-Cwg-GSOI0AaHsODalSuvdVn2yQ8_O_ToQ67ahCYhoUVpu9Gxsq96jQ1Qji5HGW1I6h8o-8",
  "q": "z-DTZ67FXLUvp77oi3TKziHiBzgrlkzkWIPTd219MimSyIhc0sqdCl9iviX1D1fuDZryeJpJwuyCZXT68x_9ORra8MXAfNCR3TUQTpcSuSNys7LfTzQBhM6BWx-7HnnMAM0PoXFZ63w_Bfm1h5uedZlbsEAPKC5AeyFka7LjFXk",
  "dp": "bBbaDf9kZ7QkELwGmkxKikp505b2IdyxdQYabpmI9FLFWGvXWOaBUSg5S6g4gbGw27Rq2vdkUGot1TNzCOyr41J-xICgkh96ldsOBgc9XTCH21tgC43ND91nafZ-H2ryNHd8KhIEPYiBDDeL_BL3Ek_uFw4zMXURWRQMvkQOJIE",
  "dq": "ju-xjV5wGLIBBZ_QeGujM5-6smoeFmfirzZdxoXDiyVo53hUEyD8YHB8DfE9kwJMDpDXXrQAOga0Fp0cHOaHEKf1mY7wLyKe2XKuNsvMNP851HQO9n_092OjMIwd9vOaoYZe1AyD3tb84tfzyT3o9EWx9PvnMCK1dbTdPuyvFkk",
  "qi": "1W_OUuRGOwj99i9O6qsnJCO68oIvqZHxBKbJZ4QW_KTv4YZz_P_wFb5jabdCzzm-yjpm3vs-Be1Xsm5qdJRZjsNm7BZ2T-Vr8m09gybsdiQJ7vVS-iWSwCWsX-f_t57AEi2b1xv5HxdzYxdsgztfnL-GOXdfVFNDaCtjrfbqxsI"
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const jweToken = body.token ? body.token.replace(/\s+/g, '') : null;
    const telefone = body.telefone;
    const id_cliente = body.id_cliente;

    if (!jweToken) {
      return NextResponse.json({ error: 'Token JWE não fornecido' }, { status: 400 });
    }

    const privateKey = await jose.importJWK(jwkChavePrivada, 'RSA-OAEP-256');
    const { plaintext } = await jose.compactDecrypt(jweToken, privateKey);
    const decryptedString = new TextDecoder().decode(plaintext);

    let historicoParseado;
    try {
      // Tenta limpar quebras de linha e caracteres invisíveis que partem o JSON
      const cleanString = decryptedString
        .replace(/[\u0000-\u0009\u000B-\u001F]/g, '') // Remove invisíveis (exceto o Enter \n)
        .replace(/\n/g, '\\n') // Escapa os Enters
        .replace(/\r/g, '\\r') // Escapa retornos de carro
        .replace(/\t/g, '\\t'); // Escapa tabulações

      historicoParseado = JSON.parse(cleanString);
    } catch (parseError: any) {
      // SE FALHAR A CONVERSÃO PARA JSON, DEVOLVEMOS-LHE O TEXTO BRUTO DAS MENSAGENS!
      return NextResponse.json({
        error: 'A API da RD enviou caracteres inválidos',
        detalhe: parseError.message,
        id_cliente: id_cliente,
        telefone: telefone,
        texto_bruto_desencriptado: decryptedString // O "Santo Graal" limpo para podermos ler!
      }, { status: 500 });
    }

    // Sucesso absoluto
    return NextResponse.json({ 
      success: true, 
      id_cliente: id_cliente,
      telefone: telefone,
      historico: historicoParseado 
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Falha na descriptografia JWE', detalhe: error.message }, { status: 500 });
  }
}