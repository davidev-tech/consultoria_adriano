import { Search, Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSearch } from "@/hooks/useSearch"; // Conexão com a memória

export function AppHeader() {
  // Pegamos o valor da busca e a função que escreve nela
  const { searchTerm, setSearchTerm } = useSearch();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger />
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes, relatórios, atividades..."
          className="h-10 rounded-lg border-border bg-muted/40 pl-9 focus-visible:bg-card"
          // --- AS DUAS LINHAS DE OURO ---
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          // ------------------------------
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 rounded-full border border-border bg-card px-2 py-1 pr-3 shadow-soft">
          <Avatar className="h-7 w-7">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              MC
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-xs font-medium">Adriano</span>
            <span className="text-[10px] text-muted-foreground">Consultor Sênior</span>
          </div>
        </div>
      </div>
    </header>
  );
}