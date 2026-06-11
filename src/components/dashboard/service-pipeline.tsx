import { ArrowRight } from "lucide-react";

interface Stage {
  status: string;
  count: number;
  color: string;
}

interface ServicePipelineProps {
  stages: Stage[];
}

export function ServicePipeline({ stages }: ServicePipelineProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {stages.map((stage, idx) => (
        <div key={stage.status} className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`flex size-10 items-center justify-center rounded-full ${stage.color} text-xs font-bold text-white shadow-sm`}
            >
              {stage.count}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {stage.status}
            </span>
          </div>
          {idx < stages.length - 1 && (
            <ArrowRight className="size-4 shrink-0 text-muted-foreground/40" />
          )}
        </div>
      ))}
    </div>
  );
}
