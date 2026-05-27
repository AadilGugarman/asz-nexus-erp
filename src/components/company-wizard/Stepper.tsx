import React from "react";
import {
  Check,
  Building2,
  Coins,
  Settings2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { StepConfig } from "@/types/company";

interface StepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  getStepStatus: (
    stepId: number,
  ) => "completed" | "warning" | "incomplete" | "pending";
}

export const STEPS: StepConfig[] = [
  {
    id: 1,
    title: "Company Details",
    subtitle: "Legal & Location",
    icon: "Building2",
  },
  {
    id: 2,
    title: "Financial Settings",
    subtitle: "Tax & Currency",
    icon: "Coins",
  },
  {
    id: 3,
    title: "Review & Confirm",
    subtitle: "Verify & Initialize",
    icon: "FileText",
  },
];

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  onStepClick,
  getStepStatus,
}) => {
  const getIcon = (iconName: string, isCurrent: boolean, status: string) => {
    const className = `w-4 h-4 ${
      isCurrent || status === "completed"
        ? "text-white"
        : status === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
    }`;

    if (status === "completed" && !isCurrent) {
      return <Check className="w-4 h-4 stroke-[2.5] text-white" />;
    }
    if (status === "warning" && !isCurrent) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    switch (iconName) {
      case "Building2": return <Building2 className={className} />;
      case "Coins":     return <Coins className={className} />;
      case "Settings2": return <Settings2 className={className} />;
      case "FileText":  return <FileText className={className} />;
      default:          return <Building2 className={className} />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5">
      <div className="max-w-5xl mx-auto">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between gap-2">
            {STEPS.map((step, index) => {
              const isCurrent = currentStep === step.id;
              const status = getStepStatus(step.id);
              return (
                <li key={step.id} className="relative flex-1">
                  <div className="flex items-center w-full">
                    <button
                      onClick={() => onStepClick(step.id)}
                      className="group flex items-center gap-2 w-full text-left cursor-pointer transition-all"
                    >
                      {/* Icon */}
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all font-semibold shrink-0 ${
                          isCurrent
                            ? "bg-blue-600 text-white ring-2 ring-blue-100 dark:ring-blue-500/20"
                            : status === "completed"
                              ? "bg-emerald-600 text-white"
                              : status === "warning"
                                ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                        }`}
                      >
                        {getIcon(step.icon, isCurrent, status)}
                      </div>
                      {/* Labels */}
                      <div className="flex-1 min-w-0 hidden sm:block">
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isCurrent
                            ? "text-blue-600 dark:text-blue-400"
                            : status === "completed"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400 dark:text-slate-500"
                        }`}>
                          Step {step.id}
                        </span>
                        <span className={`text-xs font-bold truncate block ${
                          isCurrent
                            ? "text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    </button>
                    {/* Connector */}
                    {index < STEPS.length - 1 && (
                      <div className="hidden sm:block flex-1 mx-2">
                        <div className={`h-0.5 rounded-full transition-all duration-300 ${
                          status === "completed"
                            ? "bg-emerald-500"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};
