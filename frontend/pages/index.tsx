import Head from "next/head";
import { useAuth, useUserProfile } from "../lib/msal-auth-context";
import TabsInterface from "../components/TabsInterface";
import EnterpriseAuthGuard from "../components/auth/EnterpriseAuthGuard";

export default function HomePage() {
  const { signOut } = useAuth();
  const userProfile = useUserProfile();

  return (
    <>
      <Head>
        <title>SageSure - Enterprise Insurance Platform</title>
        <meta
          name="description"
          content="Enterprise-grade AI-powered insurance platform with intelligent chat assistants for claims, underwriting, and policy management."
        />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/brand/sagesure-mark.png" />
      </Head>

      <EnterpriseAuthGuard>
        <TabsInterface signOut={signOut} user={userProfile} />
      </EnterpriseAuthGuard>
    </>
  );
}
