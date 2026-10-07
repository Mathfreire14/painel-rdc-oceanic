export const metadata = {
  title: 'Dashboard Grupo Oceanic',
  description: 'Painel de métricas e performance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}