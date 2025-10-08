import Head from "next/head";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>SageInsure - AI-Powered Insurance Claims Management</title>
        <link rel="icon" href="/sageinsure_favicon.png" />
      </Head>
      {/* TabsInterface is already rendered in _app.tsx, so we don't need it here */}
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome to SageInsure
        </h1>
        <p className="text-gray-600 mt-2">
          Use the tabs above to navigate between different insurance tools.
        </p>
      </div>
    </>
  );
}
