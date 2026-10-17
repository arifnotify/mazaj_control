import { redirect } from "next/navigation";
import { isAdminSessionValid } from "@/lib/adminSession";
import PurchaseCenterClient from "./PurchaseCenterClient";

export const dynamic = "force-dynamic";

export default async function PurchaseCenterPage() {
  const isAdmin = await isAdminSessionValid();

  if (!isAdmin) {
    redirect("/admin/login");
  }

  return <PurchaseCenterClient />;
}
