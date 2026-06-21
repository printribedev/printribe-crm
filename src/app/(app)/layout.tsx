import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "linear-gradient(145deg, #eef0fb 0%, #f4f6ff 25%, #f8fafc 60%, #f0fdf8 100%)",
    }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
