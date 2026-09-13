interface FormFeedbackBannerProps {
  message: string;
  severity: "warning" | "critical";
}

export function FormFeedbackBanner({ message, severity }: FormFeedbackBannerProps) {
  const severityClass = severity === "critical" ? "bg-red-600" : "bg-amber-500";

  return (
    <div
      className={`absolute left-1/2 top-4 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-medium text-white shadow-lg ${severityClass}`}
    >
      {message}
    </div>
  );
}
