import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useLogout, useGetNotifications } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  Bell,
  UserCircle,
  LogOut,
  Menu,
} from "lucide-react";

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: notifications } = useGetNotifications({
    query: { refetchInterval: 30000 } as any,
  });
  const unreadCount = notifications?.filter((n: any) => !n.is_read).length ?? 0;

  if (!user) return null;

  const isAdmin = user.role === "admin";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true, badge: 0 },
    { href: "/tasks", label: isAdmin ? "All Tasks" : "My Tasks", icon: CheckSquare, show: true, badge: 0 },
    { href: "/users", label: "Users", icon: Users, show: isAdmin, badge: 0 },
    { href: "/notifications", label: "Notifications", icon: Bell, show: true, badge: unreadCount },
    { href: "/profile", label: "Profile", icon: UserCircle, show: true, badge: 0 },
  ];

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navItems.filter((item) => item.show).map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
            {item.label}
            {item.badge > 0 && (
              <span className="ml-auto min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b shrink-0">
          <span className="font-bold text-xl tracking-tight text-primary">TaskFlow</span>
        </div>
        <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t shrink-0">
          <div className="mb-4 px-2 flex flex-col">
            <span className="text-sm font-semibold truncate">{user.full_name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            onClick={() =>
              logoutMutation.mutate(undefined, {
                onSuccess: () => (window.location.href = "/login"),
              })
            }
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:hidden shrink-0">
          <span className="font-bold text-lg text-primary">TaskFlow</span>
          <div className="flex items-center gap-2">
            {/* Bell shortcut with badge */}
            <Link href="/notifications" className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            {/* Hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <div className="h-14 flex items-center px-6 border-b shrink-0">
                  <span className="font-bold text-xl tracking-tight text-primary">TaskFlow</span>
                </div>
                <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
                  <NavLinks onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="p-4 border-t shrink-0">
                  <div className="mb-3 px-2 flex flex-col">
                    <span className="text-sm font-semibold truncate">{user.full_name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() =>
                      logoutMutation.mutate(undefined, {
                        onSuccess: () => (window.location.href = "/login"),
                      })
                    }
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}