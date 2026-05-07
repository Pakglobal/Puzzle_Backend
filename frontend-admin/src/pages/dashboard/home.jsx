import React, { useEffect, useState } from "react";
import {
  Typography,
} from "@material-tailwind/react";
import {
  UserGroupIcon,
  PuzzlePieceIcon,
  FolderIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import { StatisticsCard } from "@/widgets/cards";

export function Home() {
  const [stats, setStats] = useState({
    users: 0,
    collections: 0,
    scenes: 0,
    notifications: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:3000/admin/dashboard/stats");
        const json = await response.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
  }, []);

  const statsCardsData = [
    {
      color: "gray",
      icon: UserGroupIcon,
      title: "Total Players",
      value: stats.users.toString(),
      footer: {
        color: "text-green-500",
        value: "+100%",
        label: "all time",
      },
    },
    {
      color: "gray",
      icon: FolderIcon,
      title: "Collections",
      value: stats.collections.toString(),
      footer: {
        color: "text-green-500",
        value: "Active",
        label: "in game",
      },
    },
    {
      color: "gray",
      icon: PuzzlePieceIcon,
      title: "Puzzle Scenes",
      value: stats.scenes.toString(),
      footer: {
        color: "text-green-500",
        value: "Ready",
        label: "for players",
      },
    },
    {
      color: "gray",
      icon: BellIcon,
      title: "Notifications",
      value: stats.notifications.toString(),
      footer: {
        color: "text-green-500",
        value: "System",
        label: "active reach",
      },
    },
  ];

  return (
    <div className="mt-12">
      <div className="mb-12 grid gap-y-10 gap-x-6 md:grid-cols-2 xl:grid-cols-4">
        {statsCardsData.map(({ icon, title, footer, ...rest }) => (
          <StatisticsCard
            key={title}
            {...rest}
            title={title}
            icon={React.createElement(icon, {
              className: "w-6 h-6 text-white",
            })}
            footer={
              <Typography className="font-normal text-blue-gray-600">
                <strong className={footer.color}>{footer.value}</strong>
                &nbsp;{footer.label}
              </Typography>
            }
          />
        ))}
      </div>
    </div>
  );
}

export default Home;
