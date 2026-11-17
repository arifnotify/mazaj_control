import { headers } from "next/headers";
import DashboardHome from "./DashboardHome";
import StorefrontHome from "./storefront/StorefrontHome";

export default async function HomePage() {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
  const isCustomerDomain = host === "mazajnuts.com" || host === "www.mazajnuts.com";
  return isCustomerDomain ? <StorefrontHome /> : <DashboardHome />;
}
