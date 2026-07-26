// xd
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { WalletClient } from "@/components/wallet/WalletClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Billetera | Hubio",
};

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/wallet");

  return (
    <main className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-2">
          Mi <span className="text-brand">Billetera</span>
        </h1>
        <p className="text-gray-500 mb-10">
          Saldos USDT y BOB, ventas POS y retiros a Bolivia.
        </p>
        <WalletClient />
      </div>
    </main>
  );
}
