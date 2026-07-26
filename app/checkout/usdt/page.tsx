// xd
import { Suspense } from "react";
import SubscriptionCryptoCheckoutPage from "./SubscriptionCryptoCheckoutClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-500">Cargando checkout…</p>
        </main>
      }
    >
      <SubscriptionCryptoCheckoutPage />
    </Suspense>
  );
}
