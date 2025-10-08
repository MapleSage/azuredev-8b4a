import "../styles/globals.css";
import { AuthProvider } from "../lib/msal-auth-context";
import TabsInterface from "../components/TabsInterface";

function AppContent({ Component, pageProps }: any) {
  // Skip auth completely - go straight to app
  return (
    <div className="h-screen">
      <TabsInterface signOut={() => {}} user={{ name: "Azure User" }} />
    </div>
  );
}

function MyApp({ Component, pageProps }: any) {
  return (
    <AuthProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
}

export default MyApp;