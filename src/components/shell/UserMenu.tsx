import { useNavigate } from "react-router-dom";
import { LifeBuoy, LogOut, Settings, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthProvider";
import { initialsFor, roleLabel } from "@/lib/auth";
import { CURRENT_USER } from "@/lib/mock-shell-data";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const name = user?.full_name || user?.username || CURRENT_USER.name;
  const email = user?.email ?? CURRENT_USER.email;
  const role = user ? roleLabel(user.role) : CURRENT_USER.role;
  const initials = user ? initialsFor(user) : CURRENT_USER.initials;

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ml-1 rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-gradient-to-br from-primary/25 to-detect/20 text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="pb-0 pt-1">Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2 pt-0.5">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <Badge variant="detect" className="mt-1 font-sans normal-case">
            {role}
          </Badge>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/app/settings")}>
          <User className="h-3.5 w-3.5" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/app/settings")}>
          <Settings className="h-3.5 w-3.5" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/app/about")}>
          <LifeBuoy className="h-3.5 w-3.5" /> Support &amp; docs
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-danger focus:bg-danger/10 focus:text-danger">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
