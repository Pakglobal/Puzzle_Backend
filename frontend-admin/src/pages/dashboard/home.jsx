import React, { useEffect, useState } from "react";
import { Typography, Button, Chip } from "@material-tailwind/react";
import {
  PuzzlePieceIcon,
  FolderIcon,
  BellIcon,
  PlusIcon,
  ArrowRightIcon,
  SparklesIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, collections: 0, scenes: 0, notifications: 0 });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {


    const fetchStats = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
        const adminUrl = baseUrl.replace(/\/api$/, "");
        
        const response = await axios.get(`${adminUrl}/admin/dashboard/stats`);
        if (response.data?.success) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      icon: FolderIcon,
      label: "Collections",
      value: stats.collections,
      description: "Active story collections",
      gradient: "from-blue-500 to-cyan-400",
      bg: "bg-blue-50",
      text: "text-blue-600",
      action: () => navigate("/dashboard/collections"),
    },
    {
      icon: PuzzlePieceIcon,
      label: "Puzzle Scenes",
      value: stats.scenes,
      description: "Scenes ready for players",
      gradient: "from-violet-500 to-purple-400",
      bg: "bg-violet-50",
      text: "text-violet-600",
      action: () => navigate("/dashboard/scenes"),
    },
    {
      icon: BellIcon,
      label: "Notifications",
      value: stats.notifications,
      description: "Sent to players",
      gradient: "from-amber-500 to-orange-400",
      bg: "bg-amber-50",
      text: "text-amber-600",
      action: () => navigate("/dashboard/notifications"),
    },
  ];

  const quickActions = [
    {
      icon: PlusIcon,
      label: "Create Scene",
      desc: "Add a new puzzle scene",
      color: "light-blue",
      path: "/dashboard/create-scene",
    },
    {
      icon: FolderIcon,
      label: "New Collection",
      desc: "Group scenes into a story",
      color: "purple",
      path: "/dashboard/create-collection",
    },
    {
      icon: BellIcon,
      label: "Send Notification",
      desc: "Reach all players instantly",
      color: "amber",
      path: "/dashboard/notifications",
    },
    {
      icon: PhotoIcon,
      label: "Browse Scenes",
      desc: "View & manage all scenes",
      color: "teal",
      path: "/dashboard/scenes",
    },
  ];

  return (
    <div className="mt-8 mb-10 flex flex-col gap-8">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{
          background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #8b5cf6 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute bottom-4 right-6 h-16 w-16 rounded-full bg-white/10" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="h-5 w-5 text-yellow-300" />
              <Typography className="text-sm font-medium text-white/80 uppercase tracking-widest">
                Admin
              </Typography>
            </div>
            <Typography variant="h3" className="font-bold text-white leading-tight">
              Art Puzzle Dashboard
            </Typography>
            <Typography className="mt-1 text-white/70 text-sm max-w-md">
              Manage your puzzle collections, scenes, and player notifications — all in one place.
            </Typography>
          </div>

        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map(({ icon: Icon, label, value, description, gradient, bg, text, action }) => (
          <div
            key={label}
            onClick={action}
            className="group cursor-pointer rounded-2xl border border-blue-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <div>
                <Typography className="text-xs font-semibold uppercase tracking-widest text-blue-gray-400 mb-1">
                  {label}
                </Typography>
                <Typography variant="h2" className="font-bold text-blue-gray-800 leading-none">
                  {loading ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-blue-gray-100" />
                  ) : (
                    value
                  )}
                </Typography>
                <Typography className="mt-1 text-xs text-blue-gray-400">
                  {description}
                </Typography>
              </div>
              <div className={`rounded-xl p-3 bg-gradient-to-br ${gradient}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium group-hover:gap-2 transition-all">
              <span className={text}>View details</span>
              <ArrowRightIcon className={`h-3 w-3 ${text}`} />
            </div>
          </div>
        ))}
      </div>

      <div>
        <Typography variant="h6" className="mb-4 text-blue-gray-700 font-semibold">
          Quick Actions
        </Typography>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map(({ icon: Icon, label, desc, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-blue-gray-100 bg-white p-5 text-center shadow-sm hover:shadow-md hover:border-light-blue-200 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-light-blue-50 group-hover:bg-light-blue-100 transition-colors">
                <Icon className="h-6 w-6 text-light-blue-500" />
              </div>
              <div>
                <Typography className="text-sm font-semibold text-blue-gray-700">
                  {label}
                </Typography>
                <Typography className="text-xs text-blue-gray-400 leading-snug mt-0.5">
                  {desc}
                </Typography>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── System Status Strip ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-gray-100 bg-white px-5 py-4 shadow-sm">
        <Typography className="text-xs font-semibold uppercase tracking-widest text-blue-gray-400 mr-2">
          System Status
        </Typography>
        <Chip value="CDN Active" color="light-blue" variant="ghost" className="text-xs" />
        <Chip value="R2 Storage" color="purple" variant="ghost" className="text-xs" />
        <Chip value="Firebase FCM" color="green" variant="ghost" className="text-xs" />
      </div>

    </div>
  );
}

export default Home;
