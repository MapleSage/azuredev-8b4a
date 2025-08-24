import MsalProviderWrapper from "../msal/MsalProviderWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MsalProviderWrapper>
          {children}
        </MsalProviderWrapper>
      </body>
    </html>
  );
}