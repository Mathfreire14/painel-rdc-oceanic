import './globals.css';

export const metadata = {
  title: 'Painel RDC Oceanic',
  description: 'Dashboard de Analytics e Consumo do WhatsApp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}