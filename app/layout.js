import "./globals.css";

export const metadata = {
  title: "Axiom Scout",
  description: "Find booking businesses and fill business.ts for the Axiom halo demo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
