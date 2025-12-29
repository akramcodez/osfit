export default function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1.5 p-2 animate-fade-in">
      <div className="w-2 h-2 bg-primary rounded-full typing-dot-1" />
      <div className="w-2 h-2 bg-primary rounded-full typing-dot-2" />
      <div className="w-2 h-2 bg-primary rounded-full typing-dot-3" />
    </div>
  );
}
