'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ChevronDown, ArrowUp, ArrowDown, Minus, Search, Download, Check, Trash2, UserPlus, ShieldCheck, Info,
} from 'lucide-react';
import {
  CORES, ROTULO_CATEGORIA, ROTULO_ORIGEM, moeda, numero, pct, dataCurta, duracao,
  LinhaComparativa, BarrasEmpilhadas, BarrasHorizontais, Funil, BarraComposicao, MapaCalor, Legenda,
} from './graficos';

/* =====================================================================
   Tipos dos dados que vêm da função dashboard_dados
   ===================================================================== */
export interface Kpis {
  custo_total: number; custo_servico: number; qtd_servico: number;
  custo_utility: number; qtd_utility: number; custo_marketing: number; qtd_marketing: number;
  qtd_enviadas: number; qtd_recebidas: number; atendimentos: number; custo_por_atendimento: number;
}
export interface DadosPainel {
  kpis: Kpis;
  diario: { dia: string; servico: number; utility: number; marketing: number; qtd_servico: number }[];
  por_setor: { setor: string; custo: number; msgs: number }[];
  por_origem: { origem: string; custo: number; msgs: number }[];
  heatmap: { dow: number; hora: number; msgs: number }[];
  operadores: { operador: string; setores: string; msgs: number; custo: number; atendimentos: number; tme: number | null; tma: number | null }[];
  funil: { enviados: number; entregues: number; lidos: number; respondidos: number; custo: number };
  bot: { atendimentos_com_bot: number; resolvidos_pelo_bot: number };
  tabulacao: { tabulacao: string; atendimentos: number; custo: number }[];
  iniciado_por: { iniciado_por: string; atendimentos: number; custo: number }[];
  ultima_sincronizacao: string | null;
  painel_atualizado_em: string | null;
}
export interface TemplateDetectado {
  padrao: string; titulo: string; categoria: string; classificado: boolean;
  exemplo: string; envios: number; respondidos: number; custo: number; ultimo_envio: string;
}
export interface Tarifa { modelo: string; categoria: string; valor: number; vigente_desde: string }
export interface Usuario { id: string; email: string; created_at: string; last_sign_in_at: string | null; is_admin: boolean }

export function nomeTabulacao(t: string) {
  if (t === 'sem_tabulacao') return 'Sem tabulação';
  const s = t.replace(/__/g, ' - ').replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const ROTULO_INICIADO: Record<string, string> = {
  customer: 'Cliente', system: 'Sistema', operator: 'Operador', nao_informado: 'Não informado',
};

export function dataHora(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

/* =====================================================================
   Componentes de interface
   ===================================================================== */
export function Cartao({ titulo, descricao, acoes, children, className = '' }: {
  titulo?: string; descricao?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`pn-cartao ${className}`}>
      {(titulo || acoes) && (
        <header className="pn-cartao-topo">
          <div>
            {titulo && <h2>{titulo}</h2>}
            {descricao && <p>{descricao}</p>}
          </div>
          {acoes}
        </header>
      )}
      {children}
    </section>
  );
}

/* Variação vs período anterior. Para custo, subir é ruim. */
export function Variacao({ atual, anterior, custo = false }: { atual: number; anterior: number; custo?: boolean }) {
  if (!anterior) return <span className="pn-var pn-var-neutra"><Minus size={12} /> sem base anterior</span>;
  const v = ((atual - anterior) / anterior) * 100;
  if (Math.abs(v) < 0.05) return <span className="pn-var pn-var-neutra"><Minus size={12} /> estável</span>;
  const subiu = v > 0;
  const classe = custo ? (subiu ? 'pn-var-ruim' : 'pn-var-boa') : 'pn-var-neutra';
  return (
    <span className={`pn-var ${classe}`}>
      {subiu ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {pct(Math.abs(v))} {subiu ? 'acima' : 'abaixo'}
    </span>
  );
}

export function Kpi({ rotulo, valor, detalhe, atual, anterior, custo, destaque, cor }: {
  rotulo: string; valor: string; detalhe?: string; atual: number; anterior: number;
  custo?: boolean; destaque?: boolean; cor?: string;
}) {
  return (
    <div className={`pn-kpi ${destaque ? 'pn-kpi-destaque' : ''}`}>
      <span className="pn-kpi-rotulo">
        {cor && <span className="pn-legenda-marca" style={{ background: cor }} />}
        {rotulo}
      </span>
      <span className="pn-kpi-valor">{valor}</span>
      {detalhe && <span className="pn-kpi-detalhe">{detalhe}</span>}
      <Variacao atual={atual} anterior={anterior} custo={custo} />
    </div>
  );
}

/* Seleção múltipla em lista suspensa */
export function MultiSelect({ rotulo, opcoes, selecionados, onChange, rotuloOpcao }: {
  rotulo: string; opcoes: string[]; selecionados: string[]; onChange: (v: string[]) => void;
  rotuloOpcao?: (v: string) => string;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);
  const nome = (v: string) => (rotuloOpcao ? rotuloOpcao(v) : v);
  const filtradas = opcoes.filter(o => nome(o).toLowerCase().includes(busca.toLowerCase()));
  const resumo = selecionados.length === 0 ? 'Todos' : selecionados.length === 1 ? nome(selecionados[0]) : `${selecionados.length} selecionados`;
  const alternar = (o: string) => onChange(selecionados.includes(o) ? selecionados.filter(s => s !== o) : [...selecionados, o]);
  return (
    <div className="pn-filtro" ref={ref}>
      <span className="pn-filtro-rotulo">{rotulo}</span>
      <button type="button" className={`pn-select ${selecionados.length ? 'pn-select-ativo' : ''}`} onClick={() => setAberto(a => !a)} aria-expanded={aberto}>
        <span>{resumo}</span><ChevronDown size={14} />
      </button>
      {aberto && (
        <div className="pn-pop">
          {opcoes.length > 8 && (
            <input className="pn-pop-busca" placeholder="Buscar" value={busca} onChange={e => setBusca(e.target.value)} autoFocus />
          )}
          <ul>
            {filtradas.map(o => (
              <li key={o}>
                <label>
                  <input type="checkbox" checked={selecionados.includes(o)} onChange={() => alternar(o)} />
                  <span>{nome(o)}</span>
                </label>
              </li>
            ))}
            {filtradas.length === 0 && <li className="pn-pop-vazio">Nenhuma opção</li>}
          </ul>
          {selecionados.length > 0 && (
            <button type="button" className="pn-pop-limpar" onClick={() => onChange([])}>Limpar seleção</button>
          )}
        </div>
      )}
    </div>
  );
}

export type Preset = 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'mes_anterior' | 'personalizado';
export const PRESETS: { valor: Preset; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'ontem', rotulo: 'Ontem' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mes_anterior', rotulo: 'Mês anterior' },
  { valor: 'personalizado', rotulo: 'Personalizado' },
];

export interface Filtros {
  preset: Preset; inicio: string; fim: string;
  setores: string[]; origens: string[]; categorias: string[]; operadores: string[];
}

export function BarraFiltros({ filtros, setFiltros, opcoesSetor, opcoesOperador, periodoAnterior, carregando }: {
  filtros: Filtros; setFiltros: (f: Filtros) => void;
  opcoesSetor: string[]; opcoesOperador: string[];
  periodoAnterior: { inicio: string; fim: string }; carregando: boolean;
}) {
  const algumFiltro = filtros.setores.length + filtros.origens.length + filtros.categorias.length + filtros.operadores.length > 0;
  return (
    <div className="pn-filtros">
      <div className="pn-filtro">
        <span className="pn-filtro-rotulo">Período</span>
        <select className="pn-select" value={filtros.preset} onChange={e => setFiltros({ ...filtros, preset: e.target.value as Preset })}>
          {PRESETS.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
      </div>
      {filtros.preset === 'personalizado' && (
        <div className="pn-filtro pn-filtro-datas">
          <span className="pn-filtro-rotulo">De / até</span>
          <div>
            <input type="date" className="pn-select" value={filtros.inicio} max={filtros.fim} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} />
            <input type="date" className="pn-select" value={filtros.fim} min={filtros.inicio} onChange={e => setFiltros({ ...filtros, fim: e.target.value })} />
          </div>
        </div>
      )}
      <MultiSelect rotulo="Setor" opcoes={opcoesSetor} selecionados={filtros.setores} onChange={v => setFiltros({ ...filtros, setores: v })} />
      <MultiSelect rotulo="Origem" opcoes={['operador', 'bot', 'automatica', 'campanha']} rotuloOpcao={v => ROTULO_ORIGEM[v] ?? v}
        selecionados={filtros.origens} onChange={v => setFiltros({ ...filtros, origens: v })} />
      <MultiSelect rotulo="Categoria" opcoes={['servico', 'utility', 'marketing']} rotuloOpcao={v => ROTULO_CATEGORIA[v] ?? v}
        selecionados={filtros.categorias} onChange={v => setFiltros({ ...filtros, categorias: v })} />
      <MultiSelect rotulo="Operador" opcoes={opcoesOperador} selecionados={filtros.operadores} onChange={v => setFiltros({ ...filtros, operadores: v })} />
      <div className="pn-filtros-fim">
        {algumFiltro && (
          <button type="button" className="pn-link" onClick={() => setFiltros({ ...filtros, setores: [], origens: [], categorias: [], operadores: [] })}>
            Limpar filtros
          </button>
        )}
        <span className="pn-comparacao">
          {carregando ? 'Atualizando…' : <>Comparado a {dataCurta(periodoAnterior.inicio)}–{dataCurta(periodoAnterior.fim)}</>}
        </span>
      </div>
    </div>
  );
}

/* =====================================================================
   ABA: Visão geral
   ===================================================================== */
export function VisaoGeral({ atual, anterior }: { atual: DadosPainel; anterior: DadosPainel | null }) {
  const k = atual.kpis;
  const ka = anterior?.kpis;
  const origem = (o: string) => atual.por_origem.find(p => p.origem === o)?.msgs ?? 0;
  const semRetorno = atual.tabulacao.find(t => t.tabulacao === 'saudacao_sem_retorno');
  const taxaBot = atual.bot.atendimentos_com_bot ? (atual.bot.resolvidos_pelo_bot / atual.bot.atendimentos_com_bot) * 100 : 0;
  const custoBot = atual.por_origem.find(p => p.origem === 'bot')?.custo ?? 0;
  const dias = atual.diario.map(d => d.dia);

  return (
    <div className="pn-pagina">
      {/* Indicadores */}
      <div className="pn-kpis">
        <Kpi destaque rotulo="Custo total estimado" valor={moeda(k.custo_total)}
          detalhe={`${numero(k.qtd_enviadas)} mensagens enviadas`} atual={k.custo_total} anterior={ka?.custo_total ?? 0} custo />
        <Kpi rotulo="Serviço" cor={CORES.servico} valor={moeda(k.custo_servico)}
          detalhe={`${numero(k.qtd_servico)} mensagens`} atual={k.custo_servico} anterior={ka?.custo_servico ?? 0} custo />
        <Kpi rotulo="Utility" cor={CORES.utility} valor={moeda(k.custo_utility)}
          detalhe={`${numero(k.qtd_utility)} templates`} atual={k.custo_utility} anterior={ka?.custo_utility ?? 0} custo />
        <Kpi rotulo="Marketing" cor={CORES.marketing} valor={moeda(k.custo_marketing)}
          detalhe={`${numero(k.qtd_marketing)} templates`} atual={k.custo_marketing} anterior={ka?.custo_marketing ?? 0} custo />
        <Kpi rotulo="Custo por atendimento" valor={moeda(k.custo_por_atendimento)}
          detalhe={`${numero(k.atendimentos)} atendimentos`} atual={k.custo_por_atendimento} anterior={ka?.custo_por_atendimento ?? 0} custo />
      </div>

      {/* Destaques acionáveis */}
      <div className="pn-alertas">
        {semRetorno && semRetorno.custo > 0 && (
          <div className="pn-alerta">
            <Info size={18} />
            <p>
              <strong>{moeda(semRetorno.custo)}</strong> ({pct(k.custo_total ? (semRetorno.custo / k.custo_total) * 100 : 0)} do custo) foram gastos em{' '}
              {numero(semRetorno.atendimentos)} conversas encerradas como <em>saudação sem retorno</em>, em que o cliente não respondeu.
            </p>
          </div>
        )}
        {custoBot > 0 && (
          <div className="pn-alerta">
            <Info size={18} />
            <p>
              O bot enviou {numero(origem('bot'))} mensagens, ao custo de <strong>{moeda(custoBot)}</strong>.{' '}
              {pct(taxaBot)} dos atendimentos com bot terminaram sem precisar de um operador.
            </p>
          </div>
        )}
      </div>

      <Cartao titulo="Mensagens de serviço por dia"
        descricao="Volume diário no período selecionado comparado ao período anterior equivalente."
        acoes={<Legenda itens={[{ cor: CORES.servico, rotulo: 'Período atual' }, { cor: CORES.anterior, rotulo: 'Período anterior', tracejado: true }]} />}>
        <LinhaComparativa
          atual={atual.diario.map(d => d.qtd_servico)}
          anterior={anterior?.diario.map(d => d.qtd_servico) ?? []}
          rotulos={atual.diario.map(d => dataCurta(d.dia))}
          rotulosAnterior={anterior?.diario.map(d => dataCurta(d.dia)) ?? []}
        />
      </Cartao>

      <div className="pn-grade-2">
        <Cartao titulo="Custo diário por categoria"
          acoes={<Legenda itens={[{ cor: CORES.servico, rotulo: 'Serviço' }, { cor: CORES.utility, rotulo: 'Utility' }, { cor: CORES.marketing, rotulo: 'Marketing' }]} />}>
          <BarrasEmpilhadas dias={dias} series={[
            { chave: 'servico', rotulo: 'Serviço', cor: CORES.servico, valores: atual.diario.map(d => d.servico) },
            { chave: 'utility', rotulo: 'Utility', cor: CORES.utility, valores: atual.diario.map(d => d.utility) },
            { chave: 'marketing', rotulo: 'Marketing', cor: CORES.marketing, valores: atual.diario.map(d => d.marketing) },
          ]} />
        </Cartao>
        <Cartao titulo="Custo por setor" descricao="Participação de cada setor no custo do período.">
          {atual.por_setor.length
            ? <BarrasHorizontais itens={atual.por_setor.map(s => ({ rotulo: s.setor, valor: s.custo, detalhe: `${numero(s.msgs)} mensagens` }))} />
            : <Vazio />}
        </Cartao>
      </div>

      <div className="pn-grade-2">
        <Cartao titulo="Funil dos templates"
          descricao={<>Se o investimento em template está gerando conversa. Custo dos templates: <strong>{moeda(atual.funil.custo)}</strong>.</>}>
          <Funil etapas={[
            { rotulo: 'Enviados', valor: atual.funil.enviados },
            { rotulo: 'Entregues', valor: atual.funil.entregues, dica: 'Status "entregue" ou "lido"' },
            { rotulo: 'Lidos', valor: atual.funil.lidos },
            { rotulo: 'Respondidos', valor: atual.funil.respondidos, dica: 'Cliente respondeu em até 24h' },
          ]} />
        </Cartao>
        <Cartao titulo="Bot x humano" descricao="Quem envia as mensagens cobradas.">
          <BarraComposicao partes={[
            { rotulo: 'Operador', valor: origem('operador'), cor: CORES.operador },
            { rotulo: 'Bot', valor: origem('bot'), cor: CORES.bot },
            { rotulo: 'Automática', valor: origem('automatica'), cor: CORES.automatica },
            { rotulo: 'Campanha', valor: origem('campanha'), cor: CORES.campanha },
          ]} />
          <div className="pn-retencao">
            <span className="pn-retencao-valor">{pct(taxaBot)}</span>
            <span>
              de retenção do bot: {numero(atual.bot.resolvidos_pelo_bot)} de {numero(atual.bot.atendimentos_com_bot)} atendimentos
              com bot terminaram sem mensagem de operador.
            </span>
          </div>
        </Cartao>
      </div>

      <div className="pn-grade-2">
        <Cartao titulo="Volume por dia da semana e hora" descricao="Mensagens enviadas e recebidas. Ajuda a dimensionar a equipe.">
          <MapaCalor celulas={atual.heatmap} />
        </Cartao>
        <Cartao titulo="Custo por motivo de encerramento" descricao="Tabulação dos atendimentos abertos no período (filtros de setor e operador).">
          <TabelaSimples
            colunas={['Tabulação', 'Atend.', 'Custo', 'Médio']}
            linhas={atual.tabulacao.slice(0, 8).map(t => [
              nomeTabulacao(t.tabulacao), numero(t.atendimentos), moeda(t.custo), moeda(t.atendimentos ? t.custo / t.atendimentos : 0),
            ])}
          />
          <div className="pn-iniciado">
            {atual.iniciado_por.map(i => (
              <span key={i.iniciado_por}>
                Iniciados por {(ROTULO_INICIADO[i.iniciado_por] ?? i.iniciado_por).toLowerCase()}: <strong>{numero(i.atendimentos)}</strong>
              </span>
            ))}
          </div>
        </Cartao>
      </div>
    </div>
  );
}

function Vazio({ texto = 'Sem dados para o período e filtros selecionados.' }: { texto?: string }) {
  return <p className="pn-vazio">{texto}</p>;
}

function TabelaSimples({ colunas, linhas }: { colunas: string[]; linhas: (string | number)[][] }) {
  if (!linhas.length) return <Vazio />;
  return (
    <div className="pn-tabela-rolagem">
      <table className="pn-tabela">
        <thead><tr>{colunas.map((c, i) => <th key={c} className={i ? 'pn-num' : ''}>{c}</th>)}</tr></thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>{l.map((c, j) => <td key={j} className={j ? 'pn-num' : ''}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =====================================================================
   ABA: Operadores
   ===================================================================== */
type ColunaOp = 'operador' | 'msgs' | 'custo' | 'atendimentos' | 'custo_atend' | 'tme' | 'tma';

export function Operadores({ dados }: { dados: DadosPainel }) {
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<{ col: ColunaOp; desc: boolean }>({ col: 'custo', desc: true });
  const total = dados.operadores.reduce((a, o) => a + o.custo, 0) || 1;
  const linhas = useMemo(() => {
    const valor = (o: DadosPainel['operadores'][number], c: ColunaOp): number | string =>
      c === 'operador' ? o.operador.toLowerCase()
        : c === 'custo_atend' ? (o.atendimentos ? o.custo / o.atendimentos : 0)
        : (o[c] ?? -1);
    return dados.operadores
      .filter(o => `${o.operador} ${o.setores}`.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => {
        const va = valor(a, ordem.col), vb = valor(b, ordem.col);
        const r = va < vb ? -1 : va > vb ? 1 : 0;
        return ordem.desc ? -r : r;
      });
  }, [dados.operadores, busca, ordem]);

  const exportar = () => {
    const cab = ['Operador', 'Setores', 'Mensagens', 'Custo (R$)', '% do custo', 'Atendimentos', 'Custo por atendimento', 'TME (s)', 'TMA (s)'];
    const corpo = linhas.map(o => [
      o.operador, o.setores, o.msgs, o.custo.toFixed(2).replace('.', ','), ((o.custo / total) * 100).toFixed(1).replace('.', ','),
      o.atendimentos, (o.atendimentos ? o.custo / o.atendimentos : 0).toFixed(2).replace('.', ','),
      o.tme != null ? Math.round(o.tme) : '', o.tma != null ? Math.round(o.tma) : '',
    ]);
    const csv = [cab, ...corpo].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'operadores.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const Th = ({ col, children, num = true }: { col: ColunaOp; children: ReactNode; num?: boolean }) => (
    <th className={num ? 'pn-num' : ''} aria-sort={ordem.col === col ? (ordem.desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" className="pn-ordenar" onClick={() => setOrdem(o => ({ col, desc: o.col === col ? !o.desc : true }))}>
        {children}{ordem.col === col && (ordem.desc ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </th>
  );

  return (
    <div className="pn-pagina">
      <Cartao titulo="Custo por operador"
        descricao="Mensagens assinadas pelo operador e mensagens automáticas atribuídas a ele (saudação e encerramento). TME e TMA vêm do relatório da RD."
        acoes={
          <div className="pn-acoes">
            <label className="pn-busca"><Search size={14} /><input placeholder="Buscar operador ou setor" value={busca} onChange={e => setBusca(e.target.value)} /></label>
            <button type="button" className="pn-botao-sec" onClick={exportar}><Download size={14} /> Exportar CSV</button>
          </div>
        }>
        {linhas.length === 0 ? <Vazio /> : (
          <div className="pn-tabela-rolagem">
            <table className="pn-tabela">
              <thead>
                <tr>
                  <Th col="operador" num={false}>Operador</Th>
                  <th>Setores</th>
                  <Th col="msgs">Mensagens</Th>
                  <Th col="custo">Custo</Th>
                  <th className="pn-num">% do custo</th>
                  <Th col="atendimentos">Atendimentos</Th>
                  <Th col="custo_atend">Custo/atend.</Th>
                  <Th col="tme">TME</Th>
                  <Th col="tma">TMA</Th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(o => (
                  <tr key={o.operador}>
                    <td className="pn-forte">{o.operador}</td>
                    <td><div className="pn-chips">{o.setores.split(', ').map(s => <span key={s} className="pn-chip">{s}</span>)}</div></td>
                    <td className="pn-num">{numero(o.msgs)}</td>
                    <td className="pn-num pn-forte">{moeda(o.custo)}</td>
                    <td className="pn-num">
                      <span className="pn-mini-barra"><i style={{ width: `${(o.custo / total) * 100}%` }} /></span>
                      {pct((o.custo / total) * 100)}
                    </td>
                    <td className="pn-num">{numero(o.atendimentos)}</td>
                    <td className="pn-num">{moeda(o.atendimentos ? o.custo / o.atendimentos : 0)}</td>
                    <td className="pn-num">{duracao(o.tme)}</td>
                    <td className="pn-num">{duracao(o.tma)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}

/* =====================================================================
   ABA: Templates (todos os usuários podem classificar)
   ===================================================================== */
export function Templates({ templates, carregando, onSalvar }: {
  templates: TemplateDetectado[]; carregando: boolean;
  onSalvar: (t: { padrao: string; titulo: string; categoria: string }) => Promise<string | null>;
}) {
  return (
    <div className="pn-pagina">
      <Cartao titulo="Templates enviados"
        descricao="A categoria define o preço de cada envio. Confira a categoria aprovada no WhatsApp Manager da Meta e ajuste aqui. Templates novos entram como Utility até serem classificados.">
        {carregando ? <p className="pn-vazio">Carregando templates…</p>
          : templates.length === 0 ? <Vazio texto="Nenhum template enviado até agora." />
          : <ul className="pn-templates">{templates.map(t => <LinhaTemplate key={t.padrao} t={t} onSalvar={onSalvar} />)}</ul>}
      </Cartao>
    </div>
  );
}

function LinhaTemplate({ t, onSalvar }: {
  t: TemplateDetectado;
  onSalvar: (t: { padrao: string; titulo: string; categoria: string }) => Promise<string | null>;
}) {
  const [titulo, setTitulo] = useState(t.titulo);
  const [categoria, setCategoria] = useState(t.classificado ? t.categoria : 'utility');
  const [estado, setEstado] = useState<'' | 'salvando' | 'salvo' | string>('');
  const alterado = titulo !== t.titulo || !t.classificado || categoria !== t.categoria;
  const salvar = async () => {
    setEstado('salvando');
    const erro = await onSalvar({ padrao: t.padrao, titulo: titulo.trim(), categoria });
    setEstado(erro ?? 'salvo');
  };
  return (
    <li className="pn-template">
      <div className="pn-template-texto">
        {!t.classificado && <span className="pn-selo">Não classificado</span>}
        <input className="pn-input" placeholder="Dê um nome para este template" value={titulo} onChange={e => { setTitulo(e.target.value); setEstado(''); }} />
        <p>{t.exemplo}</p>
        <span className="pn-template-meta">
          {numero(t.envios)} envios, {numero(t.respondidos)} respondidos ({pct(t.envios ? (t.respondidos / t.envios) * 100 : 0)}), custo {moeda(t.custo)}, último em {dataHora(t.ultimo_envio)}
        </span>
      </div>
      <div className="pn-template-acoes">
        <div className="pn-segmentado" role="radiogroup" aria-label="Categoria">
          {['utility', 'marketing'].map(c => (
            <button key={c} type="button" role="radio" aria-checked={categoria === c}
              className={categoria === c ? 'pn-seg-ativo' : ''} onClick={() => { setCategoria(c); setEstado(''); }}>
              <span className="pn-legenda-marca" style={{ background: c === 'utility' ? CORES.utility : CORES.marketing }} />
              {ROTULO_CATEGORIA[c]}
            </button>
          ))}
        </div>
        <button type="button" className="pn-botao" disabled={!alterado || estado === 'salvando'} onClick={salvar}>
          {estado === 'salvando' ? 'Salvando…' : 'Salvar'}
        </button>
        {estado === 'salvo' && <span className="pn-ok"><Check size={14} /> Salvo. Os custos já foram recalculados.</span>}
        {estado && !['salvando', 'salvo'].includes(estado) && <span className="pn-erro">{estado}</span>}
      </div>
    </li>
  );
}

/* =====================================================================
   ABA: Informações
   ===================================================================== */
export function Informacoes({ tarifas, modelo, ultimaSync, painelAtualizado }: {
  tarifas: Tarifa[]; modelo: string; ultimaSync: string | null; painelAtualizado: string | null;
}) {
  const vigentes = tarifas.filter(t => t.modelo === modelo);
  return (
    <div className="pn-pagina pn-info">
      <Cartao titulo="Como o custo é calculado">
        <p>
          Cada mensagem enviada ao cliente é cobrada pela RD conforme a categoria, no modelo{' '}
          <strong>{modelo === 'pos_pago' ? 'pós-pago' : 'créditos'}</strong>. Mensagens recebidas do cliente não têm custo.
        </p>
        <TabelaSimples colunas={['Categoria', 'Valor por mensagem', 'Vigente desde']}
          linhas={vigentes.map(t => [ROTULO_CATEGORIA[t.categoria] ?? t.categoria, moeda(Number(t.valor)), dataCurta(t.vigente_desde) + '/' + t.vigente_desde.slice(0, 4)])} />
        <ul className="pn-lista">
          <li><strong>Serviço:</strong> qualquer mensagem que não é template, enviada por operador, bot ou automação, dentro da conversa.</li>
          <li><strong>Utility e Marketing:</strong> templates aprovados na Meta. A categoria de cada um é definida na aba Templates.</li>
          <li>Templates de utility também são cobrados dentro da janela de 24h, conforme a regra da RD.</li>
        </ul>
      </Cartao>

      <div className="pn-grade-2">
        <Cartao titulo="Status das mensagens">
          <ul className="pn-lista">
            <li><strong>Enviada</strong> (checked), <strong>entregue</strong> (success) e <strong>lida</strong> (read): entram no custo.</li>
            <li><strong>Erro</strong> (error): não entra no custo.</li>
          </ul>
        </Cartao>
        <Cartao titulo="Origem das mensagens">
          <ul className="pn-lista">
            <li><span className="pn-legenda-marca" style={{ background: CORES.operador }} /><strong>Operador:</strong> mensagem assinada com o nome do atendente.</li>
            <li><span className="pn-legenda-marca" style={{ background: CORES.bot }} /><strong>Bot:</strong> chatbot do RD Conversas.</li>
            <li><span className="pn-legenda-marca" style={{ background: CORES.automatica }} /><strong>Automática:</strong> saudação e encerramento enviados pelo sistema.</li>
            <li><span className="pn-legenda-marca" style={{ background: CORES.campanha }} /><strong>Campanha:</strong> disparo em massa.</li>
          </ul>
        </Cartao>
      </div>

      <Cartao titulo="Limitações dos dados">
        <ul className="pn-lista">
          <li>A RD não informa se o contato veio de um anúncio Click-to-WhatsApp. A gratuidade de 7 dias desses contatos não é descontada, então o custo deles aparece <strong>superestimado</strong>.</li>
          <li>O histórico começa em 07/10/2026.</li>
          <li>Emojis e alguns símbolos (como • e aspas curvas) chegam corrompidos da RD e podem aparecer estranhos nos textos.</li>
          <li>O valor é uma estimativa feita a partir do histórico de mensagens. A fatura da RD é a referência oficial.</li>
        </ul>
      </Cartao>

      <Cartao titulo="Atualização dos dados">
        <ul className="pn-lista">
          <li>O n8n busca as conversas no RD Conversas todos os dias às 6h. Última sincronização: <strong>{dataHora(ultimaSync)}</strong>.</li>
          <li>O painel recalcula as bases de hora em hora. Última atualização: <strong>{dataHora(painelAtualizado)}</strong>.</li>
        </ul>
      </Cartao>
    </div>
  );
}

/* =====================================================================
   ABA: Minha conta
   ===================================================================== */
export function MinhaConta({ email, onTrocarSenha }: {
  email: string; onTrocarSenha: (atual: string, nova: string) => Promise<string | null>;
}) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (nova.length < 8) return setMsg({ tipo: 'erro', texto: 'A nova senha precisa ter pelo menos 8 caracteres.' });
    if (nova !== confirma) return setMsg({ tipo: 'erro', texto: 'A confirmação não é igual à nova senha.' });
    setEnviando(true);
    const erro = await onTrocarSenha(atual, nova);
    setEnviando(false);
    if (erro) return setMsg({ tipo: 'erro', texto: erro });
    setAtual(''); setNova(''); setConfirma('');
    setMsg({ tipo: 'ok', texto: 'Senha alterada. Use a nova senha no próximo acesso.' });
  };
  return (
    <div className="pn-pagina pn-estreita">
      <Cartao titulo="Minha conta" descricao={<>Você está conectado como <strong>{email}</strong>.</>}>
        <form className="pn-form" onSubmit={enviar}>
          <label>Senha atual<input className="pn-input" type="password" required autoComplete="current-password" value={atual} onChange={e => setAtual(e.target.value)} /></label>
          <label>Nova senha<input className="pn-input" type="password" required minLength={8} autoComplete="new-password" value={nova} onChange={e => setNova(e.target.value)} /></label>
          <label>Confirme a nova senha<input className="pn-input" type="password" required minLength={8} autoComplete="new-password" value={confirma} onChange={e => setConfirma(e.target.value)} /></label>
          {msg && <p className={msg.tipo === 'ok' ? 'pn-ok' : 'pn-erro'}>{msg.texto}</p>}
          <button className="pn-botao" disabled={enviando}>{enviando ? 'Alterando…' : 'Alterar senha'}</button>
        </form>
      </Cartao>
    </div>
  );
}

/* =====================================================================
   ABA: Gestão de acessos (só administradores)
   ===================================================================== */
export function GestaoAcessos({ usuarios, carregando, meuId, onCriar, onExcluir }: {
  usuarios: Usuario[]; carregando: boolean; meuId: string;
  onCriar: (email: string, senha: string, admin: boolean) => Promise<string | null>;
  onExcluir: (id: string) => Promise<string | null>;
}) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [admin, setAdmin] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const criar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const erro = await onCriar(email.trim(), senha, admin);
    setEnviando(false);
    if (erro) return setMsg({ tipo: 'erro', texto: erro });
    setMsg({ tipo: 'ok', texto: `Acesso criado para ${email.trim()}.` });
    setEmail(''); setSenha(''); setAdmin(false);
  };
  const excluir = async (u: Usuario) => {
    const erro = await onExcluir(u.id);
    setConfirmar(null);
    setMsg(erro ? { tipo: 'erro', texto: erro } : { tipo: 'ok', texto: `Acesso de ${u.email} removido.` });
  };

  return (
    <div className="pn-pagina">
      <div className="pn-grade-acessos">
        <Cartao titulo="Novo acesso">
          <form className="pn-form" onSubmit={criar}>
            <label>E-mail<input className="pn-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@grupooceanic.com.br" /></label>
            <label>Senha inicial<input className="pn-input" type="password" required minLength={8} value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo de 8 caracteres" /></label>
            <label className="pn-check"><input type="checkbox" checked={admin} onChange={e => setAdmin(e.target.checked)} /> Administrador (pode criar e remover acessos)</label>
            {msg && <p className={msg.tipo === 'ok' ? 'pn-ok' : 'pn-erro'}>{msg.texto}</p>}
            <button className="pn-botao" disabled={enviando}><UserPlus size={15} /> {enviando ? 'Criando…' : 'Criar acesso'}</button>
          </form>
        </Cartao>
        <Cartao titulo="Acessos" descricao={`${usuarios.length} ${usuarios.length === 1 ? 'pessoa tem' : 'pessoas têm'} acesso ao painel.`}>
          {carregando ? <p className="pn-vazio">Carregando acessos…</p> : (
            <div className="pn-tabela-rolagem">
              <table className="pn-tabela">
                <thead><tr><th>E-mail</th><th>Criado em</th><th>Último acesso</th><th /></tr></thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id}>
                      <td className="pn-forte">
                        {u.email}
                        {u.is_admin && <span className="pn-chip pn-chip-admin"><ShieldCheck size={12} /> Admin</span>}
                        {u.id === meuId && <span className="pn-chip">Você</span>}
                      </td>
                      <td>{dataHora(u.created_at)}</td>
                      <td>{dataHora(u.last_sign_in_at)}</td>
                      <td className="pn-num">
                        {u.id !== meuId && (confirmar === u.id ? (
                          <span className="pn-confirmar">
                            Remover?
                            <button type="button" className="pn-botao-perigo" onClick={() => excluir(u)}>Sim, remover</button>
                            <button type="button" className="pn-link" onClick={() => setConfirmar(null)}>Cancelar</button>
                          </span>
                        ) : (
                          <button type="button" className="pn-icone-perigo" aria-label={`Remover acesso de ${u.email}`} onClick={() => setConfirmar(u.id)}>
                            <Trash2 size={15} />
                          </button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      </div>
    </div>
  );
}

/* =====================================================================
   Estilos do painel
   ===================================================================== */
export const ESTILOS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap');

.pn-app {
  --trilho: #0e2a3e; --trilho-texto: #a8bccb; --trilho-ativo: #1fc6ea;
  --fundo: #f2f4f6; --superficie: #ffffff; --bloco: #e7eaed; --linha: #dde2e6;
  --tinta: #17232d; --tinta-2: #4b5965; --tinta-3: #75818c;
  --destaque: #1fc6ea; --destaque-tinta: #06303d; --acao: #0b7fa8;
  --ok: #0c7a0c; --erro: #c23434;
  font-family: 'Nunito Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--tinta); background: var(--fundo); min-height: 100vh;
  display: grid; grid-template-columns: 100px 1fr; font-size: 14px; line-height: 1.45;
}
.pn-app *, .pn-app *::before, .pn-app *::after { box-sizing: border-box; }
.pn-app button { font: inherit; cursor: pointer; }
.pn-app :focus-visible { outline: 2px solid var(--acao); outline-offset: 2px; border-radius: 4px; }

/* Trilho lateral */
.pn-trilho { background: var(--trilho); display: flex; flex-direction: column; align-items: stretch; padding: 14px 8px; gap: 4px; position: sticky; top: 0; height: 100vh; }
.pn-marca { width: 40px; height: 40px; margin: 0 auto 18px; border-radius: 10px; display: grid; place-items: center; background: var(--trilho-ativo); color: var(--trilho); font-weight: 800; font-size: 15px; letter-spacing: -0.02em; }
.pn-nav { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 2px; border: 0; background: transparent; color: var(--trilho-texto); border-radius: 10px; font-size: 11px; font-weight: 600; text-align: center; line-height: 1.2; }
.pn-nav:hover { color: #fff; background: rgba(255,255,255,.06); }
.pn-nav[aria-current="page"] { color: #fff; background: rgba(31,198,234,.16); box-shadow: inset 3px 0 0 var(--trilho-ativo); }
.pn-trilho-fim { margin-top: auto; display: flex; flex-direction: column; gap: 4px; }

/* Área principal */
.pn-principal { min-width: 0; display: flex; flex-direction: column; }
.pn-topo { position: sticky; top: 0; z-index: 20; background: rgba(242,244,246,.92); backdrop-filter: blur(6px); border-bottom: 1px solid var(--linha); }
.pn-titulo { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; padding: 16px 28px 0; }
.pn-titulo h1 { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.01em; }
.pn-titulo span { color: var(--tinta-3); font-size: 13px; }
.pn-conteudo { padding: 22px 28px 28px; flex: 1; }
.pn-rodape { padding: 14px 28px 22px; color: var(--tinta-3); font-size: 12px; display: flex; gap: 22px; flex-wrap: wrap; }

/* Filtros */
.pn-filtros { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 14px; padding: 12px 28px 14px; }
.pn-filtro { display: flex; flex-direction: column; gap: 4px; position: relative; }
.pn-filtro-rotulo { font-size: 12px; font-weight: 700; color: var(--tinta-2); }
.pn-filtro-datas > div { display: flex; gap: 6px; }
.pn-select { appearance: none; display: inline-flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 150px; height: 36px; padding: 0 12px; border: 1px solid #cfd6dc; border-radius: 8px; background: var(--superficie); color: var(--tinta); font: inherit; font-weight: 600; }
select.pn-select { background-image: linear-gradient(45deg, transparent 50%, var(--tinta-2) 50%), linear-gradient(135deg, var(--tinta-2) 50%, transparent 50%); background-position: calc(100% - 16px) 16px, calc(100% - 11px) 16px; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 30px; }
.pn-select-ativo { border-color: var(--acao); box-shadow: inset 0 0 0 1px var(--acao); }
.pn-pop { position: absolute; top: calc(100% + 6px); left: 0; z-index: 30; width: 260px; background: var(--superficie); border: 1px solid var(--linha); border-radius: 10px; box-shadow: 0 12px 32px rgba(14,42,62,.16); padding: 8px; }
.pn-pop ul { list-style: none; margin: 0; padding: 0; max-height: 280px; overflow: auto; }
.pn-pop label { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 6px; cursor: pointer; }
.pn-pop label:hover { background: var(--fundo); }
.pn-pop-busca { width: 100%; height: 32px; margin-bottom: 6px; padding: 0 10px; border: 1px solid var(--linha); border-radius: 6px; font: inherit; }
.pn-pop-vazio { padding: 8px; color: var(--tinta-3); }
.pn-pop-limpar { width: 100%; margin-top: 6px; padding: 7px; border: 0; border-top: 1px solid var(--linha); background: none; color: var(--acao); font-weight: 700; }
.pn-filtros-fim { margin-left: auto; display: flex; align-items: center; gap: 14px; min-height: 36px; }
.pn-comparacao { color: var(--tinta-3); font-size: 12px; }
.pn-link { border: 0; background: none; color: var(--acao); font-weight: 700; padding: 0; }

/* Páginas e cartões */
.pn-pagina { display: flex; flex-direction: column; gap: 18px; }
.pn-estreita { max-width: 520px; }
.pn-grade-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.pn-grade-acessos { display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr); gap: 18px; align-items: start; }
.pn-cartao { background: var(--superficie); border: 1px solid var(--linha); border-radius: 12px; padding: 20px 22px; min-width: 0; }
.pn-cartao-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.pn-cartao-topo h2 { margin: 0; font-size: 16px; font-weight: 800; }
.pn-cartao-topo p { margin: 4px 0 0; color: var(--tinta-2); font-size: 13px; max-width: 70ch; }

/* Indicadores */
.pn-kpis { display: grid; grid-template-columns: 1.25fr repeat(4, 1fr); gap: 12px; }
.pn-kpi { background: var(--bloco); border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pn-kpi-destaque { background: var(--destaque); color: var(--destaque-tinta); }
.pn-kpi-rotulo { font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 7px; }
.pn-kpi-valor { font-size: 27px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; font-variant-numeric: tabular-nums; }
.pn-kpi-destaque .pn-kpi-valor { font-size: 31px; }
.pn-kpi-detalhe { font-size: 12px; color: var(--tinta-2); }
.pn-kpi-destaque .pn-kpi-detalhe { color: var(--destaque-tinta); opacity: .85; }
.pn-var { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; margin-top: 4px; }
.pn-var-ruim { color: var(--erro); }
.pn-var-boa { color: var(--ok); }
.pn-var-neutra { color: var(--tinta-2); }
.pn-kpi-destaque .pn-var { color: var(--destaque-tinta); }

/* Destaques */
.pn-alertas { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
.pn-alertas:empty { display: none; }
.pn-alerta { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 12px; background: #e9f7fb; border: 1px solid #bfe6f1; color: #0c3a4a; }
.pn-alerta svg { flex: none; margin-top: 2px; color: var(--acao); }
.pn-alerta p { margin: 0; font-size: 13.5px; }

/* Gráficos */
.pn-grafico { position: relative; width: 100%; }
.pn-grafico svg { display: block; overflow: visible; }
.pn-grade { stroke: #e8ecef; stroke-width: 1; }
.pn-eixo { fill: var(--tinta-3); font-size: 11px; font-variant-numeric: tabular-nums; }
.pn-mira { stroke: #9aa4ad; stroke-width: 1; stroke-dasharray: 3 3; }
.pn-tooltip { position: absolute; pointer-events: none; background: #0e2a3e; color: #fff; border-radius: 8px; padding: 9px 11px; font-size: 12px; min-width: 170px; box-shadow: 0 8px 22px rgba(14,42,62,.25); z-index: 5; }
.pn-tooltip-titulo { font-weight: 800; margin-bottom: 4px; }
.pn-tooltip-linha { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 7px; padding: 1px 0; }
.pn-tooltip-linha strong { font-variant-numeric: tabular-nums; }
.pn-tooltip-total { border-top: 1px solid rgba(255,255,255,.2); margin-top: 4px; padding-top: 4px; }
.pn-legenda { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--tinta-2); }
.pn-legenda-item { display: inline-flex; align-items: center; gap: 6px; }
.pn-legenda-marca { display: inline-block; width: 10px; height: 10px; border-radius: 3px; flex: none; }

.pn-hbarras { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.pn-hbarras li { display: grid; grid-template-columns: minmax(90px, 38%) 1fr auto; align-items: center; gap: 12px; }
.pn-hbarras-rotulo { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pn-hbarras-trilho { height: 14px; display: block; }
.pn-hbarras-barra { display: block; height: 100%; border-radius: 0 4px 4px 0; }
.pn-hbarras-valor { font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; display: flex; flex-direction: column; line-height: 1.2; }
.pn-hbarras-valor small { font-weight: 600; color: var(--tinta-3); font-size: 11px; }

.pn-funil { display: flex; align-items: stretch; flex-wrap: wrap; gap: 8px 0; }
.pn-funil-passo { display: flex; align-items: center; flex: 1 1 120px; min-width: 0; }
.pn-funil-caixa { flex: 1; background: var(--bloco); border-radius: 12px; padding: 16px 10px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.pn-funil-passo:first-child .pn-funil-caixa { background: var(--destaque); color: var(--destaque-tinta); }
.pn-funil-rotulo { font-size: 12px; font-weight: 700; }
.pn-funil-valor { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
.pn-funil-seta { position: relative; z-index: 1; margin: 0 -6px; flex: none; background: #0b0f12; color: #fff; font-size: 12px; font-weight: 800; padding: 5px 12px 5px 9px; clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 50%, calc(100% - 9px) 100%, 0 100%); font-variant-numeric: tabular-nums; }

.pn-composicao { display: flex; height: 18px; gap: 2px; border-radius: 5px; overflow: hidden; }
.pn-composicao span { display: block; min-width: 2px; }
.pn-composicao-legenda { list-style: none; padding: 0; margin: 14px 0 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
.pn-composicao-legenda li { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 2px 8px; }
.pn-composicao-legenda strong { font-variant-numeric: tabular-nums; }
.pn-composicao-legenda small { grid-column: 2 / 4; color: var(--tinta-3); font-size: 11px; }
.pn-retencao { display: flex; gap: 12px; align-items: center; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--linha); color: var(--tinta-2); font-size: 13px; }
.pn-retencao-valor { font-size: 26px; font-weight: 800; color: var(--tinta); font-variant-numeric: tabular-nums; }

.pn-calor-grade { display: grid; grid-template-columns: 34px repeat(24, minmax(0, 1fr)); gap: 2px; }
.pn-calor-linha { display: contents; }
.pn-calor-hora { font-size: 10px; color: var(--tinta-3); text-align: left; }
.pn-calor-dia { font-size: 11px; color: var(--tinta-2); font-weight: 600; align-self: center; }
.pn-calor-celula { aspect-ratio: 1 / 1; border-radius: 3px; min-height: 10px; }
.pn-calor-celula:hover { outline: 2px solid var(--tinta); outline-offset: 0; }
.pn-calor-rodape { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; font-size: 12px; color: var(--tinta-2); }
.pn-calor-escala { display: inline-flex; align-items: center; gap: 2px; }
.pn-calor-escala i { width: 14px; height: 10px; border-radius: 2px; display: inline-block; }
.pn-calor-escala span { margin: 0 5px; }

/* Tabelas */
.pn-tabela-rolagem { overflow-x: auto; }
.pn-tabela { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.pn-tabela th { text-align: left; font-size: 12px; font-weight: 700; color: var(--tinta-2); padding: 8px 10px; border-bottom: 1px solid var(--linha); white-space: nowrap; }
.pn-tabela td { padding: 10px; border-bottom: 1px solid #edf0f2; vertical-align: middle; }
.pn-tabela tbody tr:hover { background: #f7f9fa; }
.pn-num { text-align: right !important; white-space: nowrap; }
.pn-forte { font-weight: 700; }
.pn-ordenar { border: 0; background: none; padding: 0; font-weight: 700; color: inherit; display: inline-flex; align-items: center; gap: 3px; }
.pn-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.pn-chip { display: inline-flex; align-items: center; gap: 3px; background: var(--fundo); border: 1px solid var(--linha); border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 600; color: var(--tinta-2); margin-left: 6px; }
.pn-chips .pn-chip { margin-left: 0; }
.pn-chip-admin { background: #e6f6fb; border-color: #bfe6f1; color: #0b5d7a; }
.pn-mini-barra { display: inline-block; width: 48px; height: 6px; background: #edf0f2; border-radius: 3px; margin-right: 8px; vertical-align: middle; overflow: hidden; }
.pn-mini-barra i { display: block; height: 100%; background: var(--acao); }
.pn-iniciado { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 14px; font-size: 12px; color: var(--tinta-2); }
.pn-vazio { color: var(--tinta-3); margin: 8px 0; }

/* Formulários e botões */
.pn-acoes { display: flex; gap: 10px; flex-wrap: wrap; }
.pn-busca { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border: 1px solid #cfd6dc; border-radius: 8px; background: var(--superficie); color: var(--tinta-3); }
.pn-busca input { border: 0; outline: 0; font: inherit; color: var(--tinta); width: 200px; background: transparent; }
.pn-form { display: flex; flex-direction: column; gap: 14px; }
.pn-form label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; font-weight: 700; color: var(--tinta-2); }
.pn-form .pn-check { flex-direction: row; align-items: center; gap: 8px; font-weight: 600; }
.pn-input { height: 38px; padding: 0 12px; border: 1px solid #cfd6dc; border-radius: 8px; font: inherit; color: var(--tinta); background: var(--superficie); width: 100%; }
.pn-input:focus { border-color: var(--acao); outline: 0; box-shadow: 0 0 0 3px rgba(11,127,168,.15); }
.pn-botao { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 38px; padding: 0 18px; border: 0; border-radius: 8px; background: var(--acao); color: #fff; font-weight: 700; }
.pn-botao:hover:not(:disabled) { background: #086a8d; }
.pn-botao:disabled { opacity: .45; cursor: default; }
.pn-botao-sec { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid #cfd6dc; border-radius: 8px; background: var(--superficie); color: var(--tinta); font-weight: 700; }
.pn-botao-perigo { height: 30px; padding: 0 12px; border: 0; border-radius: 6px; background: var(--erro); color: #fff; font-weight: 700; }
.pn-icone-perigo { border: 0; background: none; color: var(--tinta-3); padding: 6px; border-radius: 6px; }
.pn-icone-perigo:hover { color: var(--erro); background: #fbecec; }
.pn-confirmar { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; }
.pn-ok { color: var(--ok); font-weight: 700; display: inline-flex; align-items: center; gap: 5px; margin: 0; font-size: 13px; }
.pn-erro { color: var(--erro); font-weight: 700; margin: 0; font-size: 13px; }

/* Templates */
.pn-templates { list-style: none; margin: 0; padding: 0; }
.pn-template { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; padding: 18px 0; border-top: 1px solid var(--linha); }
.pn-template:first-child { border-top: 0; padding-top: 0; }
.pn-template-texto { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pn-template-texto .pn-input { max-width: 420px; font-weight: 700; }
.pn-template-texto p { margin: 0; color: var(--tinta-2); background: var(--fundo); border-radius: 8px; padding: 10px 12px; font-size: 13px; }
.pn-template-meta { font-size: 12px; color: var(--tinta-3); }
.pn-template-acoes { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.pn-selo { align-self: flex-start; background: #fff3d6; color: #6b4a00; border: 1px solid #f3d58a; border-radius: 999px; font-size: 11px; font-weight: 800; padding: 2px 10px; }
.pn-segmentado { display: inline-flex; border: 1px solid #cfd6dc; border-radius: 8px; overflow: hidden; }
.pn-segmentado button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: var(--superficie); padding: 8px 14px; font-weight: 700; color: var(--tinta-2); }
.pn-segmentado button + button { border-left: 1px solid #cfd6dc; }
.pn-segmentado .pn-seg-ativo { background: var(--trilho); color: #fff; }

/* Informações */
.pn-info p { margin: 0 0 14px; max-width: 75ch; }
.pn-lista { margin: 14px 0 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; max-width: 80ch; }
.pn-lista li { display: flex; gap: 8px; align-items: baseline; }
.pn-lista li::before { content: ''; flex: none; width: 5px; height: 5px; border-radius: 50%; background: var(--tinta-3); transform: translateY(-2px); }
.pn-lista li:has(.pn-legenda-marca)::before { display: none; }

/* Estados de carregamento */
.pn-carregando { opacity: .55; transition: opacity .2s; pointer-events: none; }
.pn-aviso-erro { padding: 16px 18px; border-radius: 12px; background: #fbecec; border: 1px solid #f1c4c4; color: #7a1d1d; }

/* Telas menores */
@media (max-width: 1180px) {
  .pn-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .pn-kpi-destaque { grid-column: span 3; }
}
@media (max-width: 900px) {
  .pn-grade-2, .pn-grade-acessos { grid-template-columns: minmax(0, 1fr); }
  .pn-template { grid-template-columns: minmax(0, 1fr); }
  .pn-template-acoes { align-items: flex-start; }
}
@media (max-width: 720px) {
  .pn-app { grid-template-columns: minmax(0, 1fr); }
  .pn-trilho { position: sticky; top: 0; z-index: 40; height: auto; flex-direction: row; overflow-x: auto; padding: 6px 8px; }
  .pn-marca { display: none; }
  .pn-trilho-fim { margin: 0; flex-direction: row; }
  .pn-nav { flex: none; min-width: 72px; }
  .pn-nav[aria-current="page"] { box-shadow: inset 0 -3px 0 var(--trilho-ativo); }
  .pn-topo { position: static; }
  .pn-titulo, .pn-filtros, .pn-conteudo, .pn-rodape { padding-left: 16px; padding-right: 16px; }
  .pn-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pn-kpi-destaque { grid-column: span 2; }
  .pn-filtros { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .pn-filtro, .pn-select { width: 100%; min-width: 0; }
  .pn-filtro-datas, .pn-filtros-fim { grid-column: 1 / -1; }
  .pn-filtros-fim { margin-left: 0; justify-content: space-between; }
  .pn-busca input { width: 140px; }
  .pn-composicao-legenda { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .pn-carregando { transition: none; } }
`;
