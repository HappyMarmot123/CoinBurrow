export default function WidgetTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="widget-template min-h-[100dvh] p-8 mx-auto">{children}</div>
  );
}
