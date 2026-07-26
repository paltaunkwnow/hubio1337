// xd
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { WithdrawClient } from "@/components/wallet/WithdrawClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Retirar fondos | Hubio",
};

export default async function WithdrawPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/wallet/withdraw");

  return (
    <main className="min-h-screen bg-background pt-24 pb-16 px-4">
      <WithdrawClient />
    </main>
  );
}
