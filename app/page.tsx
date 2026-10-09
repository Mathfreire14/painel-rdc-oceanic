'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Info, UserCircle, ShieldCheck, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ESTILOS, BarraFiltros, VisaoGeral, Operadores, Templates, Informacoes, MinhaConta, GestaoAcessos, dataHora,
  type DadosPainel, type Filtros, type Preset, type TemplateDetectado, type Tarifa, type Usuario,
} from './components/abas';

type Aba = 'visao' | 'operadores' | 'templates' | 'info' | 'conta' | 'acessos';

const TITULOS: Record<Aba, string> = {
  visao: 'Visão geral',
  operadores: 'Operadores',
  templates: 'Templates',
  info: 'Informações',
  conta: 'Minha conta',
  acessos: 'Gestão de acessos',
};

/* ---------- Datas (sempre no fuso de Brasília) ---------- */
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const paraData = (s: string) => new Date(`${s}T12:00:00Z`);
const paraTexto = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (s: string, n: number) => { const d = paraData(s); d.setUTCDate(d.getUTCDate() + n); return paraTexto(d); };
const diasEntre = (a: string, b: string) => Math.round((paraData(b).getTime() - paraData(a).getTime()) / 86400000);
const inicioMes = (s: string) => `${s.slice(0, 7)}-01`;
const fimMes = (s: string) => { const d = paraData(inicioMes(s)); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return paraTexto(d); };
const mesAnterior = (s: string) => { const d = paraData(inicioMes(s)); d.setUTCDate(0); return paraTexto(d); };

function periodoDoPreset(p: Preset, inicio: string, fim: string, hoje: string) {
  switch (p) {
    case 'hoje': return { inicio: hoje, fim: hoje };
    case 'ontem': { const o = somarDias(hoje, -1); return { inicio: o, fim: o }; }
    case '7d': return { inicio: somarDias(hoje, -6), fim: hoje };
    case '30d': return { inicio: somarDias(hoje, -29), fim: hoje };
    case 'mes': return { inicio: inicioMes(hoje), fim: hoje };
    case 'mes_anterior': { const f = mesAnterior(hoje); return { inicio: inicioMes(f), fim: f }; }
    default: return { inicio, fim };
  }
}

/* Período anterior equivalente: mês contra mês, ou o mesmo número de dias logo antes */
function periodoAnterior(p: Preset, inicio: string, fim: string) {
  if (p === 'mes' || p === 'mes_anterior') {
    const fimAnt = mesAnterior(inicio);
    const ini = inicioMes(fimAnt);
    const dias = diasEntre(inicio, fim);
    const f = somarDias(ini, dias);
    return { inicio: ini, fim: f > fimAnt ? fimAnt : f };
  }
  const dias = diasEntre(inicio, fim);
  return { inicio: somarDias(inicio, -(dias + 1)), fim: somarDias(inicio, -1) };
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
}

export default function Painel() {
  const router = useRouter();
  const [sessao, setSessao] = useState<{ id: string; email: string; admin: boolean } | null>(null);
  const [aba, setAba] = useState<Aba>('visao');

  // Data de hoje: lida só no navegador (o Next não permite ler a hora durante a geração da página)
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => { setHoje(hojeSP()); }, []);

  // Filtros
  const [filtros, setFiltros] = useState<Filtros>({
    preset: 'mes', inicio: '', fim: '', setores: [], origens: [], categorias: [], operadores: [],
  });
  const periodo = useMemo(
    () => (hoje ? periodoDoPreset(filtros.preset, filtros.inicio || hoje, filtros.fim || hoje, hoje) : null),
    [hoje, filtros.preset, filtros.inicio, filtros.fim],
  );
  const anteriorP = useMemo(
    () => (periodo ? periodoAnterior(filtros.preset, periodo.inicio, periodo.fim) : null),
    [filtros.preset, periodo],
  );

  // Dados
  const [atual, setAtual] = useState<DadosPainel | null>(null);
  const [anterior, setAnterior] = useState<DadosPainel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0); // força recarregar os números
  const [erro, setErro] = useState<string | null>(null);
  const [opcoesSetor, setOpcoesSetor] = useState<string[]>([]);
  const [nomesOperadores, setNomesOperadores] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateDetectado[]>([]);
  const [carregandoTemplates, setCarregandoTemplates] = useState(false);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [modelo, setModelo] = useState('creditos');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);

  // Sem login, volta para a tela de login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) { router.replace('/login'); return; }
      setSessao({ id: u.id, email: u.email ?? '', admin: u.app_metadata?.role === 'admin' });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_OUT' || !s) router.replace('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Opções dos filtros e informações fixas
  useEffect(() => {
    if (!sessao) return;
    (async () => {
      const [setores, ops, tar, conf] = await Promise.all([
        supabase.from('mapeamento_setores').select('nome_exibicao'),
        supabase.from('mapeamento_operadores').select('nome_exibicao'),
        supabase.from('tarifas').select('*').order('categoria'),
        supabase.from('configuracao').select('chave, valor'),
      ]);
      const nomesSetor = Array.from(new Set((setores.data ?? []).map(s => s.nome_exibicao as string))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      setOpcoesSetor([...nomesSetor, 'Sem setor']);
      setNomesOperadores((ops.data ?? []).map(o => o.nome_exibicao as string));
      setTarifas((tar.data ?? []) as Tarifa[]);
      setModelo((conf.data ?? []).find(c => c.chave === 'modelo_cobranca')?.valor ?? 'creditos');
    })();
  }, [sessao]);

  // Números do painel (período atual e anterior)
  useEffect(() => {
    if (!sessao || !periodo || !anteriorP) return;
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    const params = (p: { inicio: string; fim: string }) => ({
      p_inicio: p.inicio,
      p_fim: p.fim,
      p_setores: filtros.setores.length ? filtros.setores : null,
      p_origens: filtros.origens.length ? filtros.origens : null,
      p_categorias: filtros.categorias.length ? filtros.categorias : null,
      p_operadores: filtros.operadores.length ? filtros.operadores : null,
    });
    Promise.all([
      supabase.rpc('dashboard_dados', params(periodo)),
      supabase.rpc('dashboard_dados', params(anteriorP)),
    ]).then(([a, b]) => {
      if (cancelado) return;
      if (a.error) setErro(`Não foi possível carregar os dados: ${a.error.message}`);
      else { setAtual(a.data as DadosPainel); setAnterior(b.error ? null : (b.data as DadosPainel)); }
      setCarregando(false);
    });
    return () => { cancelado = true; };
  }, [sessao, periodo, anteriorP, filtros.setores, filtros.origens, filtros.categorias, filtros.operadores, versao]);

  const opcoesOperador = useMemo(() => {
    const doPeriodo = atual?.operadores.map(o => o.operador) ?? [];
    return Array.from(new Set([...nomesOperadores, ...doPeriodo])).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [nomesOperadores, atual]);

  /* ---------- Templates ---------- */
  const carregarTemplates = useCallback(async () => {
    setCarregandoTemplates(true);
    const { data } = await supabase.from('vw_templates_detectados').select('*').order('envios', { ascending: false });
    setTemplates((data ?? []) as TemplateDetectado[]);
    setCarregandoTemplates(false);
  }, []);
  useEffect(() => { if (sessao && aba === 'templates') carregarTemplates(); }, [sessao, aba, carregarTemplates]);

  const salvarTemplate = async (t: { padrao: string; titulo: string; categoria: string }) => {
    const { error } = await supabase.from('templates_categoria').upsert(
      { padrao: t.padrao, titulo: t.titulo || null, categoria: t.categoria }, { onConflict: 'padrao' },
    );
    if (error) return `Não foi possível salvar: ${error.message}`;
    await carregarTemplates();
    setVersao(v => v + 1); // recalcula os números com a nova categoria
    return null;
  };

  /* ---------- Usuários ---------- */
  const carregarUsuarios = useCallback(async () => {
    setCarregandoUsuarios(true);
    const res = await fetch('/api/auth/users', { headers: await authHeaders() });
    if (res.ok) setUsuarios(await res.json());
    setCarregandoUsuarios(false);
  }, []);
  useEffect(() => { if (sessao?.admin && aba === 'acessos') carregarUsuarios(); }, [sessao, aba, carregarUsuarios]);

  const criarUsuario = async (email: string, senha: string, admin: boolean) => {
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ email, password: senha, is_admin: admin }),
    });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) return corpo.error ?? 'Não foi possível criar o acesso.';
    await carregarUsuarios();
    return null;
  };
  const excluirUsuario = async (id: string) => {
    const res = await fetch(`/api/auth/users?id=${id}`, { method: 'DELETE', headers: await authHeaders() });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) return corpo.error ?? 'Não foi possível remover o acesso.';
    await carregarUsuarios();
    return null;
  };

  /* ---------- Minha conta ---------- */
  const trocarSenha = async (atualSenha: string, nova: string) => {
    if (!sessao) return 'Sessão expirada. Entre novamente.';
    const { error: errLogin } = await supabase.auth.signInWithPassword({ email: sessao.email, password: atualSenha });
    if (errLogin) return 'A senha atual está incorreta.';
    const { error } = await supabase.auth.updateUser({ password: nova });
    if (error) return `Não foi possível alterar a senha: ${error.message}`;
    return null;
  };

  const sair = async () => { await supabase.auth.signOut(); router.replace('/login'); };

  if (!sessao || !periodo || !anteriorP) return null;

  const usaFiltros = aba === 'visao' || aba === 'operadores';
  const nav = (id: Aba, rotulo: string, Icone: typeof LayoutDashboard) => (
    <button type="button" className="pn-nav" aria-current={aba === id ? 'page' : undefined} onClick={() => setAba(id)}>
      <Icone size={20} />{rotulo}
    </button>
  );

  return (
    <div className="pn-app">
      <style>{ESTILOS}</style>

      <nav className="pn-trilho" aria-label="Seções do painel">
        <img className="pn-marca" src="/logo-rd.png" alt="RD Station" />
        {nav('visao', 'Visão geral', LayoutDashboard)}
        {nav('operadores', 'Operadores', Users)}
        {nav('templates', 'Templates', FileText)}
        {nav('info', 'Informações', Info)}
        <div className="pn-trilho-fim">
          {nav('conta', 'Minha conta', UserCircle)}
          {sessao.admin && nav('acessos', 'Acessos', ShieldCheck)}
          <button type="button" className="pn-nav" onClick={sair}><LogOut size={20} />Sair</button>
        </div>
      </nav>

      <div className="pn-principal">
        <header className="pn-topo">
          <div className="pn-titulo">
            <h1>{TITULOS[aba]}</h1>
            <span>Custos de mensageria do WhatsApp no RD Conversas, Grupo Oceanic</span>
          </div>
          {usaFiltros && (
            <BarraFiltros filtros={{ ...filtros, inicio: periodo.inicio, fim: periodo.fim }} setFiltros={setFiltros}
              opcoesSetor={opcoesSetor} opcoesOperador={opcoesOperador} periodoAnterior={anteriorP} carregando={carregando} />
          )}
        </header>

        <main className="pn-conteudo">
          {usaFiltros && erro && <div className="pn-aviso-erro">{erro}</div>}
          {usaFiltros && !erro && !atual && <p className="pn-vazio">Carregando dados…</p>}
          {usaFiltros && atual && (
            <div className={carregando ? 'pn-carregando' : ''}>
              {aba === 'visao' ? <VisaoGeral atual={atual} anterior={anterior} /> : <Operadores dados={atual} />}
            </div>
          )}
          {aba === 'templates' && <Templates templates={templates} carregando={carregandoTemplates} onSalvar={salvarTemplate} />}
          {aba === 'info' && (
            <Informacoes tarifas={tarifas} modelo={modelo}
              ultimaSync={atual?.ultima_sincronizacao ?? null} painelAtualizado={atual?.painel_atualizado_em ?? null} />
          )}
          {aba === 'conta' && <MinhaConta email={sessao.email} onTrocarSenha={trocarSenha} />}
          {aba === 'acessos' && sessao.admin && (
            <GestaoAcessos usuarios={usuarios} carregando={carregandoUsuarios} meuId={sessao.id}
              onCriar={criarUsuario} onExcluir={excluirUsuario} />
          )}
        </main>

        <footer className="pn-rodape">
          <span>Dados do RD Conversas sincronizados em {dataHora(atual?.ultima_sincronizacao)}</span>
          <span>Painel recalculado em {dataHora(atual?.painel_atualizado_em)}</span>
        </footer>
      </div>
    </div>
  );
}