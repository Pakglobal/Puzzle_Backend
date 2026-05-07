import {
  HomeIcon,
  PuzzlePieceIcon,
  FolderIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import { Home, Scenes, Collections, Notifications } from "@/pages/dashboard";
import { SignIn, SignUp } from "@/pages/auth";

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
  {
    layout: "auth",
    pages: [
      {
        name: "sign-in",
        path: "/sign-in",
        element: <SignIn />,
      },
      {
        name: "sign-up",
        path: "/sign-up",
        element: <SignUp />,
      },
    ],
  },
];

export default routes;
