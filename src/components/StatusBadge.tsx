import { IntakeStatus, STATUS_LABELS } from "@/lib/types";

interface StatusBadgeProps {
  status: IntakeStatus;
}

const statusStyles: Record<IntakeStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  student_started: "bg-info/15 text-info",
  student_completed: "bg-info/25 text-info",
  parent_started: "bg-info/15 text-info",
  parent_completed: "bg-success/20 text-success",
  under_review: "bg-warning/15 text-warning",
  completed: "bg-success/15 text-success border border-success/30",
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusStyles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
};

export default StatusBadge;
