import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Award,
  GraduationCap,
  X,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Activity,
  Building2,
  Microscope,
} from "lucide-react";
import { UserRole } from "../lib/AuthContext";

interface SidebarProps {
  activeTab: string;
  activeSubTab?: string;
  setActiveTab: (tab: string, subTab?: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  role: UserRole;
}

export default function Sidebar({
  activeTab,
  activeSubTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  role,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("siakad_sidebar_collapsed");
      if (stored !== null) setCollapsed(stored === "1");
    } catch {
      // localStorage tidak tersedia (mode privat); abaikan
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("siakad_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {
      // localStorage tidak tersedia (mode privat); abaikan
    }
  }, [collapsed]);

  const menuSections = [
    {
      id: "ringkasan",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "operator", "dosen", "guest"] as UserRole[],
    },
    {
      id: "mahasiswa",
      label: "Data Mahasiswa",
      icon: Users,
      roles: ["admin", "operator"] as UserRole[],
    },
    {
      id: "dosen",
      label: "Data Dosen",
      icon: BookOpen,
      roles: ["admin", "operator"] as UserRole[],
    },
    {
      id: "prestasi",
      label: "Prestasi Mahasiswa",
      icon: Award,
      roles: ["admin", "operator"] as UserRole[],
    },
    {
      id: "mbkm",
      label: "Kegiatan Luar Prodi",
      icon: Briefcase,
      roles: ["admin", "operator"] as UserRole[],
      subItems: [
        { id: "magang", label: "Magang Industri", icon: Building2 },
        { id: "penelitian", label: "Penelitian Dosen", icon: Microscope },
      ],
    },
    {
      id: "tracer",
      label: "Tracer Study Alumni",
      icon: GraduationCap,
      roles: ["admin", "operator"] as UserRole[],
    },
    {
      id: "audit",
      label: "Log Aktivitas",
      icon: Activity,
      roles: ["admin"] as UserRole[],
    },
  ];

  const visibleSections = menuSections.filter((s) => s.roles.includes(role));

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 flex flex-col justify-between transform transition-all duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:h-screen
      `}
        style={{
          width: collapsed ? 80 : 288,
          backgroundColor: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",
          borderRight:
            "1px solid color-mix(in srgb, var(--color-accent) 10%, transparent)",
        }}
      >
        {/* Header Branding */}
        <div>
          <div
            className={`flex items-center ${collapsed ? "flex-col px-2 py-3 gap-2" : "p-4 justify-between"}`}
            style={{
              borderBottom:
                "1px solid color-mix(in srgb, var(--color-accent) 8%, var(--color-base))",
            }}
          >
            <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
              <img
                src="/LOGO-01.png"
                alt="Logo UNPAD"
                className="w-9 h-9 object-contain"
              />
              {!collapsed && (
                <div>
                  <h1 className="font-display font-bold text-lg leading-tight tracking-tight text-[var(--color-base)]">
                    GEOFISIKA
                  </h1>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-full transition hidden lg:inline-flex hover:bg-[var(--color-accent-dark)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-accent)]"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={collapsed ? "Buka Sidebar" : "Tutup Sidebar"}
                title={collapsed ? "Buka Sidebar" : "Tutup Sidebar"}
                style={{ color: "var(--sidebar-text)" }}
              >
                {collapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>

              <button
                className="lg:hidden p-2 rounded-full transition hover:bg-[var(--color-accent-dark)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-accent)]"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Tutup menu"
                title="Tutup menu"
                style={{ color: "var(--sidebar-text)" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Nav Items */}
          <nav className={`mt-4 ${collapsed ? "p-2" : "p-4"} space-y-1.5`}>
            {visibleSections.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const subItems =
                "subItems" in item
                  ? (item as {
                      subItems?: {
                        id: string;
                        label: string;
                        icon: React.ComponentType<{ className?: string }>;
                      }[];
                    }).subItems
                  : undefined;

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab(
                        item.id,
                        subItems ? activeSubTab || "magang" : undefined,
                      );
                      if (!subItems) setIsMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 rounded-xl font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-accent)] ${isActive ? "shadow-md shadow-[var(--color-accent)]/15 font-semibold scale-[1.01]" : "text-[var(--sidebar-text)]/75 hover:text-white hover:bg-white/10"}`}
                    style={{
                      padding: collapsed ? "0.55rem" : "0.7rem 1rem",
                      justifyContent: collapsed ? "center" : "flex-start",
                      background: isActive
                        ? "color-mix(in srgb, var(--color-accent) 14%, var(--color-base))"
                        : "transparent",
                      color: isActive ? "var(--color-accent-dark)" : "inherit",
                    }}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}
                  </button>

                  {!collapsed && subItems && isActive && (
                    <div className="pl-6 pr-1 space-y-1">
                      {subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive =
                          (activeSubTab || "magang") === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              setActiveTab(item.id, sub.id);
                              setIsMobileOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-accent)] ${
                              isSubActive
                                ? "bg-white/20 text-white font-bold shadow-xs"
                                : "text-[var(--sidebar-text)]/70 hover:text-white hover:bg-white/10"
                            }`}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Info / DB Status Banner */}
        <div
          className={collapsed ? "p-2" : "p-3"}
          style={{
            borderTop:
              "1px solid color-mix(in srgb, var(--color-primary) 6%, var(--color-base))",
          }}
        >
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-2 py-1"}`}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "var(--color-success)" }}
            />
            {!collapsed && (
              <div className="text-xs">
                <p
                  className="font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Terhubung Supabase
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Database Sinkron
                </p>
              </div>
            )}
          </div>

          {!collapsed && (
            <div className="mt-3 text-[11px] text-[var(--sidebar-text)]/70 text-center font-mono">
              GEO INFO v2.0.0
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
