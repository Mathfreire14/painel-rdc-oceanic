'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, LogIn } from 'lucide-react';

const ESTILOS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap');
.lg { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); font-family: 'Nunito Sans', system-ui, sans-serif; color: #17232d; background: #f2f4f6; }
.lg *, .lg *::before, .lg *::after { box-sizing: border-box; }
.lg-lado { background: #0e2a3e; color: #dce7ee; padding: 48px 56px; display: flex; flex-direction: column; justify-content: space-between; }
.lg-marca { width: 44px; height: 44px; border-radius: 11px; display: grid; place-items: center; background: #1fc6ea; color: #0e2a3e; font-weight: 800; font-size: 16px; }
.lg-lado h2 { font-size: 30px; line-height: 1.2; font-weight: 800; color: #fff; margin: 0 0 14px; max-width: 16ch; letter-spacing: -0.01em; }
.lg-lado p { margin: 0; max-width: 42ch; color: #a8bccb; font-size: 15px; }
.lg-numeros { display: flex; gap: 10px; flex-wrap: wrap; }
.lg-numeros span { background: rgba(255,255,255,.07); border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #c9d7e1; }
.lg-numeros strong { display: block; color: #1fc6ea; font-size: 15px; }
.lg-form-area { display: grid; place-items: center; padding: 32px 20px; }
.lg-form { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 16px; }
.lg-form h1 { margin: 0; font-size: 24px; font-weight: 800; }
.lg-form > p { margin: -8px 0 6px; color: #4b5965; }
.lg-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 700; color: #4b5965; }
.lg-form input { height: 44px; padding: 0 14px; border: 1px solid #cfd6dc; border-radius: 9px; font: inherit; font-size: 15px; color: #17232d; background: #fff; }
.lg-form input:focus { outline: 0; border-color: #0b7fa8; box-shadow: 0 0 0 3px rgba(11,127,168,.15); }
.lg-form button { height: 46px; border: 0; border-radius: 9px; background: #0b7fa8; color: #fff; font: inherit; font-weight: 800; font-size: 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
.lg-form button:hover:not(:disabled) { background: #086a8d; }
.lg-form button:disabled { opacity: .6; cursor: default; }
.lg-form button:focus-visible { outline: 2px solid #0e2a3e; outline-offset: 2px; }
.lg-erro { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 9px; background: #fbecec; border: 1px solid #f1c4c4; color: #7a1d1d; font-size: 13px; font-weight: 600; }
.lg-ajuda { font-size: 12px; color: #75818c; margin: 0; }
@media (max-width: 820px) {
  .lg { grid-template-columns: minmax(0, 1fr); }
  .lg-lado { padding: 28px 20px; gap: 18px; }
  .lg-lado h2 { font-size: 22px; }
  .lg-numeros { display: none; }
}
`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  // Quem já está logado vai direto para o painel
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
  }, [router]);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setErro(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error || !data.session) {
      setErro('E-mail ou senha incorretos. Confira e tente de novo.');
      setEntrando(false);
      return;
    }
    router.replace('/');
  };

  return (
    <div className="lg">
      <style>{ESTILOS}</style>
      <aside className="lg-lado">
        <div className="lg-marca" aria-hidden>Oc</div>
        <div>
          <h2>Quanto custa cada conversa no WhatsApp</h2>
          <p>Custos de mensageria do RD Conversas por setor, operador, bot e template, atualizados todos os dias.</p>
        </div>
        <div className="lg-numeros">
          <span><strong>Serviço</strong>mensagens de atendimento</span>
          <span><strong>Utility</strong>templates de retorno</span>
          <span><strong>Marketing</strong>templates promocionais</span>
        </div>
      </aside>

      <main className="lg-form-area">
        <form className="lg-form" onSubmit={entrar}>
          <h1>Entrar no painel</h1>
          <p>Use o e-mail e a senha cadastrados pelo administrador.</p>
          {erro && <div className="lg-erro" role="alert"><AlertCircle size={16} />{erro}</div>}
          <label>
            E-mail
            <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@grupooceanic.com.br" />
          </label>
          <label>
            Senha
            <input type="password" required autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} />
          </label>
          <button type="submit" disabled={entrando}>
            <LogIn size={17} />{entrando ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="lg-ajuda">Esqueceu a senha? Peça a um administrador do painel para criar um novo acesso.</p>
        </form>
      </main>
    </div>
  );
}
