import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  to?: string; // se não informado, é a página atual (sem link)
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.to ? (
            <Link
              to={item.to}
              className="hover:text-primary transition-colors"
            >
              {index === 0 && <Home className="h-3.5 w-3.5 inline mr-1" />}
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}