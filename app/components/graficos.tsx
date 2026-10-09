'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/* =====================================================================
   Formatação e cores compartilhadas pelo painel
   ===================================================================== */

export const CORES = {
  // Categorias de cobrança
  servico: '#2a78d6',
  utility: '#1baf7a',
  marketing: '#eb6834',
  // Origem das mensagens
  operador: '#4a3aa7',
  bot: '#e87ba4',
  automatica: '#eda100',
  campanha: '#008300',
  // Comparação
  anterior: '#9aa4ad',
  // Status (sempre com ícone + texto)
  bom: '#0ca30c',
  ruim: '#d03b3b',
};

export const ROTULO_CATEGORIA: Record<string, string> = {
  servico: 'Serviço',
  utility: 'Utility',
  marketing: 'Marketing',
  authentication: 'Autenticação',
};

export const ROTULO_ORIGEM: Record<string, string> = {
  operador: 'Operador',
  bot: 'Bot',
  automatica: 'Automática',
  campanha: 'Campanha',
  cliente: 'Cliente',
  desconhecida: 'Não identificada',
};

const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numFmt = new Intl.NumberFormat('pt-BR');
const pctFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export const moeda = (v: number) => moedaFmt.format(v || 0);
export const numero = (v: number) => numFmt.format(Math.round(v || 0));
export const pct = (v: number) => `${pctFmt.format(v || 0)}%`;

export function moedaCurta(v: number) {
  if (Math.abs(v) >= 1000) return `R$ ${pctFmt.format(v / 1000)} mil`;
  return moeda(v);
}

export function dataCurta(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function duracao(seg: number | null | undefined) {
  if (seg == null || isNaN(seg)) return '—';
  const s = Math.round(seg);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

/* Largura do contêiner (gráficos responsivos) */
export function useLargura<T extends HTMLElement>(inicial = 640) {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(inicial);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(([e]) => setLargura(Math.max(260, e.contentRect.width)));
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, largura };
}

/* Escala "redonda" para o eixo Y */
function escalaY(max: number, passos = 4) {
  if (max <= 0) return { topo: 1, ticks: [0, 1] };
  const bruto = max / passos;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const norm = bruto / mag;
  const passo = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const topo = Math.ceil(max / passo) * passo;
  const ticks: number[] = [];
  for (let v = 0; v <= topo + passo / 2; v += passo) ticks.push(v);
  return { topo, ticks };
}

/* Tooltip simples posicionado dentro do gráfico */
function Tooltip({ x, y, largura, children }: { x: number; y: number; largura: number; children: ReactNode }) {
  const esquerda = x > largura - 200;
  return (
    <div
      className="pn-tooltip"
      style={{ left: esquerda ? undefined : x + 14, right: esquerda ? largura - x + 14 : undefined, top: Math.max(0, y - 10) }}
    >
      {children}
    </div>
  );
}

export function Legenda({ itens }: { itens: { cor: string; rotulo: string; tracejado?: boolean }[] }) {
  return (
    <div className="pn-legenda">
      {itens.map(i => (
        <span key={i.rotulo} className="pn-legenda-item">
          <span
            className="pn-legenda-marca"
            style={i.tracejado ? { borderTop: `2px dashed ${i.cor}`, background: 'transparent', height: 0 } : { background: i.cor }}
          />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}

/* =====================================================================
   1. Linha: período atual x período anterior (mesmo eixo)
   ===================================================================== */
export function LinhaComparativa({
  atual, anterior, rotulos, rotulosAnterior, formatar = numero, altura = 240,
}: {
  atual: number[];
  anterior: number[];
  rotulos: string[];
  rotulosAnterior: string[];
  formatar?: (v: number) => string;
  altura?: number;
}) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { t: 12, r: 16, b: 28, l: 52 };
  const w = largura - m.l - m.r;
  const h = altura - m.t - m.b;
  const n = Math.max(atual.length, anterior.length, 1);
  const { topo, ticks } = escalaY(Math.max(...atual, ...anterior, 0));
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => h - (v / topo) * h;
  const caminho = (s: number[]) => s.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const passoRotulo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 56))));

  return (
    <div ref={ref} className="pn-grafico" style={{ height: altura }}>
      <svg width={largura} height={altura} role="img" aria-label="Volume diário de mensagens de serviço">
        <g transform={`translate(${m.l},${m.t})`}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={0} x2={w} y1={y(t)} y2={y(t)} className="pn-grade" />
              <text x={-8} y={y(t)} className="pn-eixo" textAnchor="end" dominantBaseline="middle">{numero(t)}</text>
            </g>
          ))}
          {rotulos.map((r, i) => (i % passoRotulo === 0 || i === n - 1) && (
            <text key={i} x={x(i)} y={h + 18} className="pn-eixo" textAnchor="middle">{r}</text>
          ))}
          {anterior.length > 0 && (
            <path d={caminho(anterior)} fill="none" stroke={CORES.anterior} strokeWidth={2} strokeDasharray="5 4" />
          )}
          <path d={caminho(atual)} fill="none" stroke={CORES.servico} strokeWidth={2} />
          {hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={h} className="pn-mira" />
              {hover < anterior.length && <circle cx={x(hover)} cy={y(anterior[hover])} r={4} fill={CORES.anterior} stroke="#fff" strokeWidth={2} />}
              {hover < atual.length && <circle cx={x(hover)} cy={y(atual[hover])} r={4.5} fill={CORES.servico} stroke="#fff" strokeWidth={2} />}
            </>
          )}
          <rect
            width={w} height={h} fill="transparent"
            onMouseMove={e => {
              const bx = e.currentTarget.getBoundingClientRect();
              const i = Math.round(((e.clientX - bx.left) / bx.width) * (n - 1));
              setHover(Math.min(n - 1, Math.max(0, i)));
            }}
            onMouseLeave={() => setHover(null)}
          />
        </g>
      </svg>
      {hover != null && (
        <Tooltip x={m.l + x(hover)} y={m.t + y(atual[hover] ?? 0)} largura={largura}>
          <div className="pn-tooltip-linha">
            <span className="pn-legenda-marca" style={{ background: CORES.servico }} />
            <span>{rotulos[hover] ?? '—'}</span>
            <strong>{hover < atual.length ? formatar(atual[hover]) : '—'}</strong>
          </div>
          <div className="pn-tooltip-linha">
            <span className="pn-legenda-marca" style={{ background: CORES.anterior }} />
            <span>{rotulosAnterior[hover] ?? '—'}</span>
            <strong>{hover < anterior.length ? formatar(anterior[hover]) : '—'}</strong>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* =====================================================================
   2. Barras empilhadas: custo diário por categoria
   ===================================================================== */
export function BarrasEmpilhadas({
  dias, series, altura = 240,
}: {
  dias: string[];
  series: { chave: string; rotulo: string; cor: string; valores: number[] }[];
  altura?: number;
}) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { t: 12, r: 12, b: 28, l: 60 };
  const w = largura - m.l - m.r;
  const h = altura - m.t - m.b;
  const n = Math.max(dias.length, 1);
  const totais = dias.map((_, i) => series.reduce((a, s) => a + (s.valores[i] || 0), 0));
  const { topo, ticks } = escalaY(Math.max(...totais, 0));
  const banda = w / n;
  const barra = Math.max(3, Math.min(28, banda * 0.62));
  const y = (v: number) => h - (v / topo) * h;
  const passoRotulo = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 48))));

  return (
    <div ref={ref} className="pn-grafico" style={{ height: altura }}>
      <svg width={largura} height={altura} role="img" aria-label="Custo diário por categoria">
        <g transform={`translate(${m.l},${m.t})`}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={0} x2={w} y1={y(t)} y2={y(t)} className="pn-grade" />
              <text x={-8} y={y(t)} className="pn-eixo" textAnchor="end" dominantBaseline="middle">{moedaCurta(t)}</text>
            </g>
          ))}
          {dias.map((d, i) => {
            let base = 0;
            const cx = banda * i + banda / 2;
            const visiveis = series.filter(s => (s.valores[i] || 0) > 0);
            return (
              <g key={d} opacity={hover == null || hover === i ? 1 : 0.45}>
                {visiveis.map((s, k) => {
                  const v = s.valores[i] || 0;
                  const y0 = y(base);
                  const y1 = y(base + v);
                  base += v;
                  const alt = Math.max(0, y0 - y1 - (k > 0 ? 2 : 0));
                  const topoSeg = k === visiveis.length - 1;
                  const r = topoSeg ? Math.min(4, barra / 2, alt) : 0;
                  return (
                    <path
                      key={s.chave}
                      fill={s.cor}
                      d={`M${cx - barra / 2},${y0 - (k > 0 ? 2 : 0)} V${y1 + r} Q${cx - barra / 2},${y1} ${cx - barra / 2 + r},${y1} H${cx + barra / 2 - r} Q${cx + barra / 2},${y1} ${cx + barra / 2},${y1 + r} V${y0 - (k > 0 ? 2 : 0)} Z`}
                    />
                  );
                })}
                {(i % passoRotulo === 0 || i === n - 1) && (
                  <text x={cx} y={h + 18} className="pn-eixo" textAnchor="middle">{dataCurta(d)}</text>
                )}
                <rect x={banda * i} y={0} width={banda} height={h} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
              </g>
            );
          })}
        </g>
      </svg>
      {hover != null && (
        <Tooltip x={m.l + banda * hover + banda / 2} y={m.t + y(totais[hover])} largura={largura}>
          <div className="pn-tooltip-titulo">{dataCurta(dias[hover])}</div>
          {series.map(s => (
            <div key={s.chave} className="pn-tooltip-linha">
              <span className="pn-legenda-marca" style={{ background: s.cor }} />
              <span>{s.rotulo}</span>
              <strong>{moeda(s.valores[hover] || 0)}</strong>
            </div>
          ))}
          <div className="pn-tooltip-linha pn-tooltip-total">
            <span />
            <span>Total</span>
            <strong>{moeda(totais[hover])}</strong>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* =====================================================================
   3. Barras horizontais ordenadas (custo por setor)
   ===================================================================== */
export function BarrasHorizontais({
  itens, cor = CORES.servico, formatar = moeda,
}: {
  itens: { rotulo: string; valor: number; detalhe?: string }[];
  cor?: string;
  formatar?: (v: number) => string;
}) {
  const total = itens.reduce((a, i) => a + i.valor, 0) || 1;
  const max = Math.max(...itens.map(i => i.valor), 0) || 1;
  return (
    <ul className="pn-hbarras">
      {itens.map(i => (
        <li key={i.rotulo} title={i.detalhe}>
          <span className="pn-hbarras-rotulo">{i.rotulo}</span>
          <span className="pn-hbarras-trilho">
            <span className="pn-hbarras-barra" style={{ width: `${Math.max(1.5, (i.valor / max) * 100)}%`, background: cor }} />
          </span>
          <span className="pn-hbarras-valor">
            {formatar(i.valor)}
            <small>{pct((i.valor / total) * 100)}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* =====================================================================
   4. Funil com setas de conversão (estilo do painel da RD)
   ===================================================================== */
export function Funil({ etapas }: { etapas: { rotulo: string; valor: number; dica?: string }[] }) {
  return (
    <div className="pn-funil">
      {etapas.map((e, i) => {
        const anterior = i > 0 ? etapas[i - 1].valor : 0;
        const taxa = i > 0 && anterior > 0 ? (e.valor / anterior) * 100 : null;
        return (
          <div key={e.rotulo} className="pn-funil-passo">
            {i > 0 && (
              <span className="pn-funil-seta" title={`Conversão de ${etapas[i - 1].rotulo.toLowerCase()} para ${e.rotulo.toLowerCase()}`}>
                {taxa == null ? '—' : pct(taxa)}
              </span>
            )}
            <div className="pn-funil-caixa" title={e.dica}>
              <span className="pn-funil-rotulo">{e.rotulo}</span>
              <span className="pn-funil-valor">{numero(e.valor)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =====================================================================
   5. Barra 100% (composição por origem)
   ===================================================================== */
export function BarraComposicao({ partes }: { partes: { rotulo: string; valor: number; cor: string }[] }) {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  const visiveis = partes.filter(p => p.valor > 0);
  return (
    <div>
      <div className="pn-composicao" role="img" aria-label="Composição das mensagens enviadas por origem">
        {visiveis.map(p => (
          <span key={p.rotulo} style={{ flexGrow: p.valor, background: p.cor }} title={`${p.rotulo}: ${numero(p.valor)}`} />
        ))}
      </div>
      <ul className="pn-composicao-legenda">
        {partes.map(p => (
          <li key={p.rotulo}>
            <span className="pn-legenda-marca" style={{ background: p.cor }} />
            <span>{p.rotulo}</span>
            <strong>{pct((p.valor / total) * 100)}</strong>
            <small>{numero(p.valor)} msgs</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =====================================================================
   6. Mapa de calor dia da semana x hora
   ===================================================================== */
const RAMPA = ['#eef4fc', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function MapaCalor({ celulas }: { celulas: { dow: number; hora: number; msgs: number }[] }) {
  const [hover, setHover] = useState<{ dow: number; hora: number; msgs: number } | null>(null);
  const mapa = new Map(celulas.map(c => [`${c.dow}-${c.hora}`, c.msgs]));
  const max = Math.max(...celulas.map(c => c.msgs), 0);
  const cor = (v: number) => {
    if (!v || max === 0) return RAMPA[0];
    const i = Math.min(RAMPA.length - 1, 1 + Math.floor((v / max) * (RAMPA.length - 1.0001)));
    return RAMPA[i];
  };
  return (
    <div className="pn-calor">
      <div className="pn-calor-grade" onMouseLeave={() => setHover(null)}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="pn-calor-hora">{h % 3 === 0 ? `${h}h` : ''}</span>
        ))}
        {DIAS_SEMANA.map((d, di) => (
          <div key={d} className="pn-calor-linha">
            <span className="pn-calor-dia">{d}</span>
            {Array.from({ length: 24 }, (_, h) => {
              const v = mapa.get(`${di + 1}-${h}`) || 0;
              return (
                <span
                  key={h}
                  className="pn-calor-celula"
                  style={{ background: cor(v) }}
                  onMouseEnter={() => setHover({ dow: di + 1, hora: h, msgs: v })}
                  aria-label={`${d} ${h}h: ${numero(v)} mensagens`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="pn-calor-rodape">
        <span className="pn-calor-info">
          {hover
            ? <>{DIAS_SEMANA[hover.dow - 1]}, {hover.hora}h às {hover.hora + 1}h: <strong>{numero(hover.msgs)}</strong> mensagens</>
            : 'Passe o mouse sobre uma célula para ver o volume'}
        </span>
        <span className="pn-calor-escala">
          <span>Menos</span>
          {RAMPA.slice(1).map(c => <i key={c} style={{ background: c }} />)}
          <span>Mais</span>
        </span>
      </div>
    </div>
  );
}
