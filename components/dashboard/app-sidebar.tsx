"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/dashboard/logout-button";
import { GradientText } from "@/components/ui/gradient-text";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "@/lib/dashboard/nav-items";

function isItemActive(pathname: string, href: string, matchExact?: boolean) {
  return matchExact ? pathname === href : pathname.startsWith(href);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="gap-0 p-0">
        <div className="flex h-12 items-center px-4">
          <span className="font-display text-lg font-semibold text-sidebar-foreground">
            Agenda <GradientText>Pro</GradientText>
          </span>
        </div>
        <div className="h-[3px] w-full bg-[image:var(--gradient-primary)]" />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(pathname, item.href, item.matchExact);
            return (
              <SidebarMenuItem key={item.href}>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[image:var(--gradient-primary)]"
                  />
                )}
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  size="lg"
                  onClick={() => setOpenMobile(false)}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-2 p-2">
        <SidebarSeparator className="mx-0" />
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
