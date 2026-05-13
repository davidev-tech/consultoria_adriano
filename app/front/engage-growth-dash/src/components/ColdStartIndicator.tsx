import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { onApiEvent } from "@/lib/api/client";

export function ColdStartIndicator() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const off = onApiEvent((e) => {
      if (e.type === "cold-start") setVisible(e.show);
    });
    return () => {
      off();
    };
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-primary/40 bg-card/95 px-4 py-3 shadow-card backdrop-blur">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <div className="text-xs">
        <p className="font-medium text-foreground">Acordando o servidor na nuvem...</p>
        <p className="text-muted-foreground">pode levar 30s na primeira carga</p>
      </div>
    </div>
  );
}
