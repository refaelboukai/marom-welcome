interface ProgressHeaderProps {
  current: number;
  total: number;
  sectionLabel?: string;
}

const ProgressHeader = ({ current, total, sectionLabel }: ProgressHeaderProps) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-2 px-1">
      {sectionLabel && (
        <p className="text-sm text-muted-foreground mb-1.5 font-medium">{sectionLabel}</p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

export default ProgressHeader;
