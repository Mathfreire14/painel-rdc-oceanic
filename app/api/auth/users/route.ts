import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente com a chave de serviço (só existe no servidor)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Confere se quem chamou está logado e é administrador.
// O papel fica em app_metadata.role, que o próprio usuário não consegue alterar.
async function exigirAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { erro: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { erro: NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 }) };
  }
  if (data.user.app_metadata?.role !== 'admin') {
    return { erro: NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 }) };
  }
  return { usuario: data.user };
}

// GET: listar usuários
export async function GET(request: NextRequest) {
  const { erro } = await exigirAdmin(request);
  if (erro) return erro;

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    data.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      is_admin: u.app_metadata?.role === 'admin',
    }))
  );
}

// POST: criar usuário
export async function POST(request: NextRequest) {
  const { erro } = await exigirAdmin(request);
  if (erro) return erro;

  try {
    const { email, password, is_admin } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: is_admin ? { role: 'admin' } : {},
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ id: data.user.id, email: data.user.email });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remover usuário
export async function DELETE(request: NextRequest) {
  const { usuario, erro } = await exigirAdmin(request);
  if (erro) return erro;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
  }
  if (id === usuario!.id) {
    return NextResponse.json({ error: 'Você não pode remover o seu próprio acesso.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}