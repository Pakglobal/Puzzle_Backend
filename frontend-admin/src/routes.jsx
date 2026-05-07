import {
  HomeIcon,
  PuzzlePieceIcon,
  FolderIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import { Home, Scenes, Collections, Notifications } from "@/pages/dashboard";

const icon = {
  className: "w-5 h-5 text-inherit",
};

export const routes = [
  {
    layout: "dashboard",
    pages: [
      {
        icon: <HomeIcon {...icon} />,
        name: "dashboard",
        path: "/home",
        element: <Home />,
      },
      {
        icon: <FolderIcon {...icon} />,
        name: "collections",
        path: "/collections",
        element: <Collections />,
      },
      {
        icon: <PuzzlePieceIcon {...icon} />,
        name: "scenes",
        path: "/scenes",
        element: <Scenes />,
      },
      {
        icon: <BellIcon {...icon} />,
        name: "notifications",
        path: "/notifications",
        element: <Notifications />,
      },
    ],
  },
];

export default routes;
