import {
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchExact?: boolean;
};

export const NAV_ITEMS: NavigationItem[] = [
  { label: "Painel", href: "/dashboard", icon: LayoutDashboard, matchExact: true },
  { label: "Agenda", href: "/dashboard/agenda", icon: CalendarDays },
  { label: "Profissionais", href: "/dashboard/profissionais", icon: Users },
  { label: "Serviços", href: "/dashboard/servicos", icon: Briefcase },
  { label: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
];
