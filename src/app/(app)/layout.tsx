import Sidebar from "@/components/Sidebar";
import ChatWidget from "@/components/ChatWidget";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F7F6F2" }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {children}
      </div>
      <ChatWidget />
    </div>
  );
}
