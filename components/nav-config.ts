import {
  LayoutDashboard,
  Image as ImageIcon,
  Newspaper,
  Calendar,
  Trophy,
  BookOpen,
  Video,
  Megaphone,
  Users,
  MapPin,
  FileText,
  BarChart3,
  UserCog,
  Building2,
  Inbox,
  Mail,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Registrations",
    items: [
      { label: "Athletes", href: "/athletes", icon: UserCog },
      { label: "Associations", href: "/associations", icon: Building2 },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Hero slides", href: "/hero", icon: ImageIcon },
      { label: "News", href: "/news", icon: Newspaper },
      { label: "Events", href: "/events", icon: Calendar },
      { label: "Disciplines", href: "/disciplines", icon: Trophy },
      { label: "Programs", href: "/programs", icon: BookOpen },
      { label: "Media", href: "/media", icon: Video },
      { label: "Announcements", href: "/announcements", icon: Megaphone },
    ],
  },
  {
    label: "About site",
    items: [
      { label: "Committee", href: "/committee", icon: Users },
      { label: "State associations", href: "/state-associations", icon: MapPin },
      { label: "About content", href: "/about", icon: FileText },
      { label: "Site stats", href: "/stats", icon: BarChart3 },
    ],
  },
  {
    label: "Utility",
    items: [
      { label: "Enquiries", href: "/enquiries", icon: Inbox },
      { label: "Newsletter", href: "/newsletter", icon: Mail },
    ],
  },
];
