import { LogOut } from "lucide-react";

import { logOut } from "@/app/actions/auth";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function LogoutButton() {
  return (
    <form action={logOut}>
      <SidebarMenuButton
        type="submit"
        size="lg"
        className="text-sidebar-foreground/70 hover:text-destructive"
      >
        <LogOut />
        <span>Sair</span>
      </SidebarMenuButton>
    </form>
  );
}
