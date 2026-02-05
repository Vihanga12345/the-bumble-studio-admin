
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  className?: string;
}

export function ModuleCard({ icon: Icon, title, description, to, className }: ModuleCardProps) {
  return (
    <Link 
      to={to}
      className={cn(
        "group relative overflow-hidden rounded-lg border p-5 hover:border-primary",
        className
      )}
    >
      <div className="flex items-start justify-between space-x-4">
        <div className="space-y-2">
          <h3 className="font-semibold tracking-tight text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="p-2 bg-primary/10 rounded-full">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-20 h-20 -m-5 transform translate-full transition-transform group-hover:translate-x-0 group-hover:translate-y-0 duration-300 bg-gradient-to-tr from-primary/10 to-primary/5 rounded-full" />
    </Link>
  );
}
