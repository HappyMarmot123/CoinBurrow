export default function WidgetTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="widget-template w-[1400px] min-h-[100dvh] mx-auto">
      {children}
    </div>
  );
}
