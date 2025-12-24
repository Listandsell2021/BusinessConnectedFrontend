export const metadata = {
  title: 'Umzug Anbieter Vergleich',
  description: 'Moving service comparison platform'
};

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
