interface FormFeedbackBannerProps {
  message: string;
  severity: "warning" | "critical";
}

export function FormFeedbackBanner({ message, severity }: FormFeedbackBannerProps) {
  const severityClass =
    severity === "critical" ? "bg-red-600/90 ring-red-400/30" : "bg-amber-500/90 ring-amber-300/30";

  return (
    <div
      className={`absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium text-white shadow-lg ring-1 backdrop-blur-md ${severityClass}`}
    >
      <span aria-hidden>⚠️</span>
      {message}
    </div>
  );
}
