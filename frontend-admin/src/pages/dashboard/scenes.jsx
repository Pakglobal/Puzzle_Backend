import { useState, useEffect } from "react";
import {
    Card,
    CardHeader,
    CardBody,
    Typography,
    Chip,
    Spinner,
    IconButton,
    Tooltip,
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Button,
} from "@material-tailwind/react";
import {
    EyeIcon,
    PuzzlePieceIcon,
    PhotoIcon,
    CubeIcon,
    XMarkIcon,
    PlusIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import { getAllScenes } from "@/services/sceneService";
import toast from "react-hot-toast";

export function Scenes() {
    const navigate = useNavigate();
    const [scenes, setScenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedScene, setSelectedScene] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const fetchScenes = async () => {
        setLoading(true);
        try {
            const data = await getAllScenes();
            if (data.success) {
                setScenes(data.scenes || []);
            } else {
                toast.error("Failed to load scenes");
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to load scenes"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScenes();
    }, []);

    const openDetail = (scene) => {
        setSelectedScene(scene);
        setDetailOpen(true);
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setSelectedScene(null);
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            {/* SCENES TABLE */}
            <Card>
                <CardHeader
                    variant="gradient"
                    color="light-blue"
                    className="mb-8 p-6 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <Typography variant="h6" color="white">
                            All Scenes
                        </Typography>
                        <Chip
                            value={`${scenes.length} scene${scenes.length !== 1 ? "s" : ""}`}
                            variant="ghost"
                            color="white"
                            className="text-white border-white/30"
                        />
                    </div>
                    <Button
                        size="sm"
                        color="white"
                        className="flex items-center gap-2"
                        onClick={() => navigate("/dashboard/create-scene")}
                    >
                        <PlusIcon className="h-5 w-5" />
                        Create Scene
                    </Button>
                </CardHeader>

                <CardBody className="overflow-x-scroll px-0 pt-0 pb-2">
                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <Spinner color="light-blue" className="h-8 w-8" />
                            <Typography className="ml-3 text-blue-gray-500">
                                Loading scenes...
                            </Typography>
                        </div>
                    ) : scenes.length === 0 ? (
                        <div className="text-center py-16">
                            <PuzzlePieceIcon className="mx-auto h-12 w-12 text-blue-gray-200" />
                            <Typography className="mt-3 text-blue-gray-400 font-medium">
                                No scenes found
                            </Typography>
                            <Typography className="text-sm text-blue-gray-300">
                                Scenes will appear here once created via the API.
                            </Typography>
                        </div>
                    ) : (
                        <table className="w-full min-w-[800px] table-auto">
                            <thead>
                                <tr>
                                    {["preview", "scene name", "dimensions", "levels", "objects", "actions"].map(
                                        (el) => (
                                            <th
                                                key={el}
                                                className="border-b border-blue-gray-50 py-3 px-5 text-left"
                                            >
                                                <Typography
                                                    variant="small"
                                                    className="text-[11px] font-bold uppercase text-blue-gray-400"
                                                >
                                                    {el}
                                                </Typography>
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {scenes.map((scene, key) => {
                                    const className = `py-3 px-5 ${key === scenes.length - 1
                                        ? ""
                                        : "border-b border-blue-gray-50"
                                        }`;

                                    return (
                                        <tr key={scene.id}>
                                            {/* Preview Image */}
                                            <td className={className}>
                                                <div className="h-14 w-14 rounded-lg overflow-hidden bg-blue-gray-50">
                                                    {scene.previewUrl ? (
                                                        <img
                                                            src={scene.previewUrl}
                                                            alt={scene.sceneName}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = "none";
                                                                e.target.parentElement.innerHTML =
                                                                    '<div class="flex h-full w-full items-center justify-center"><svg class="h-6 w-6 text-blue-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center">
                                                            <PhotoIcon className="h-6 w-6 text-blue-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Scene Name */}
                                            <td className={className}>
                                                <Typography
                                                    variant="small"
                                                    color="blue-gray"
                                                    className="font-semibold"
                                                >
                                                    {scene.sceneName}
                                                </Typography>
                                                <Typography className="text-xs font-normal text-blue-gray-400">
                                                    ID: {scene.id?.slice(-8)}
                                                </Typography>
                                            </td>

                                            {/* Dimensions */}
                                            <td className={className}>
                                                <Chip
                                                    variant="ghost"
                                                    color="light-blue"
                                                    value={`${scene.width} × ${scene.height}`}
                                                    className="w-fit text-xs"
                                                />
                                            </td>

                                            {/* Levels count */}
                                            <td className={className}>
                                                <div className="flex items-center gap-1">
                                                    <div className="grid h-7 w-7 place-items-center rounded-full bg-light-blue-50">
                                                        <CubeIcon className="h-4 w-4 text-light-blue-500" />
                                                    </div>
                                                    <Typography
                                                        variant="small"
                                                        className="font-semibold text-blue-gray-600"
                                                    >
                                                        {scene.levels?.length || 0}
                                                    </Typography>
                                                </div>
                                            </td>

                                            {/* Objects count */}
                                            <td className={className}>
                                                <div className="flex items-center gap-1">
                                                    <div className="grid h-7 w-7 place-items-center rounded-full bg-light-blue-50">
                                                        <PuzzlePieceIcon className="h-4 w-4 text-light-blue-500" />
                                                    </div>
                                                    <Typography
                                                        variant="small"
                                                        className="font-semibold text-blue-gray-600"
                                                    >
                                                        {scene.objects?.length || 0}
                                                    </Typography>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className={className}>
                                                <Tooltip content="View Details">
                                                    <IconButton
                                                        variant="text"
                                                        color="light-blue"
                                                        onClick={() => openDetail(scene)}
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                    </IconButton>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </CardBody>
            </Card>

            {/* SCENE DETAIL DIALOG */}
            <Dialog
                open={detailOpen}
                handler={closeDetail}
                size="xl"
                className="max-h-[90vh] overflow-y-auto"
            >
                {selectedScene && (
                    <>
                        <DialogHeader className="flex items-center justify-between">
                            <div>
                                <Typography variant="h5" color="blue-gray">
                                    {selectedScene.sceneName}
                                </Typography>
                                <Typography variant="small" className="text-blue-gray-400 font-normal">
                                    {selectedScene.width} × {selectedScene.height} px
                                </Typography>
                            </div>
                            <IconButton variant="text" color="blue-gray" onClick={closeDetail}>
                                <XMarkIcon className="h-5 w-5" />
                            </IconButton>
                        </DialogHeader>

                        <DialogBody divider className="space-y-6">
                            {/* Main Images */}
                            <div>
                                <Typography variant="h6" color="blue-gray" className="mb-3">
                                    Scene Images
                                </Typography>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: "Preview", url: selectedScene.previewUrl },
                                        { label: "Original", url: selectedScene.originalImageUrl },
                                        { label: "Lottie", url: selectedScene.finalLottieUrl },
                                    ].map(({ label, url }) => (
                                        <div key={label} className="text-center">
                                            <Typography
                                                variant="small"
                                                className="mb-2 font-medium text-blue-gray-500"
                                            >
                                                {label}
                                            </Typography>
                                            <div className="h-40 rounded-lg bg-blue-gray-50 overflow-hidden flex items-center justify-center">
                                                {url ? (
                                                    <img
                                                        src={url}
                                                        alt={label}
                                                        className="h-full w-full object-contain"
                                                        onError={(e) => {
                                                            e.target.style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <Typography
                                                        variant="small"
                                                        className="text-blue-gray-300"
                                                    >
                                                        No image
                                                    </Typography>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Levels */}
                            <div>
                                <Typography variant="h6" color="blue-gray" className="mb-3">
                                    Levels ({selectedScene.levels?.length || 0})
                                </Typography>
                                {selectedScene.levels?.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {selectedScene.levels.map((level) => (
                                            <div
                                                key={level.levelId}
                                                className="rounded-lg border border-blue-gray-100 p-3 text-center"
                                            >
                                                <Chip
                                                    value={`Level ${level.levelId}`}
                                                    color="light-blue"
                                                    variant="ghost"
                                                    className="mb-2 w-full justify-center"
                                                />
                                                <div className="h-24 rounded bg-blue-gray-50 overflow-hidden flex items-center justify-center">
                                                    {level.imageUrl ? (
                                                        <img
                                                            src={level.imageUrl}
                                                            alt={`Level ${level.levelId}`}
                                                            className="h-full w-full object-contain"
                                                            onError={(e) => {
                                                                e.target.style.display = "none";
                                                            }}
                                                        />
                                                    ) : (
                                                        <PhotoIcon className="h-6 w-6 text-blue-gray-200" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Typography className="text-sm text-blue-gray-400">
                                        No levels defined
                                    </Typography>
                                )}
                            </div>

                            {/* Objects */}
                            <div>
                                <Typography variant="h6" color="blue-gray" className="mb-3">
                                    Objects ({selectedScene.objects?.length || 0})
                                </Typography>
                                {selectedScene.objects?.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[500px] table-auto">
                                            <thead>
                                                <tr>
                                                    {["image", "level", "position (x, y)", "size (w × h)"].map(
                                                        (h) => (
                                                            <th
                                                                key={h}
                                                                className="border-b border-blue-gray-50 py-2 px-3 text-left"
                                                            >
                                                                <Typography
                                                                    variant="small"
                                                                    className="text-[11px] font-bold uppercase text-blue-gray-400"
                                                                >
                                                                    {h}
                                                                </Typography>
                                                            </th>
                                                        )
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedScene.objects.map((obj, idx) => (
                                                    <tr key={obj.id || idx}>
                                                        <td className="py-2 px-3">
                                                            <div className="h-10 w-10 rounded bg-blue-gray-50 overflow-hidden flex items-center justify-center">
                                                                {obj.imageUrl ? (
                                                                    <img
                                                                        src={obj.imageUrl}
                                                                        alt={`Object ${idx + 1}`}
                                                                        className="h-full w-full object-contain"
                                                                        onError={(e) => {
                                                                            e.target.style.display = "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <PuzzlePieceIcon className="h-4 w-4 text-blue-gray-200" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <Chip
                                                                value={`L${obj.levelId || "?"}`}
                                                                variant="ghost"
                                                                color="light-blue"
                                                                className="w-fit text-xs"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <Typography
                                                                variant="small"
                                                                className="text-xs text-blue-gray-600"
                                                            >
                                                                {obj.x}, {obj.y}
                                                            </Typography>
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <Typography
                                                                variant="small"
                                                                className="text-xs text-blue-gray-600"
                                                            >
                                                                {obj.width} × {obj.height}
                                                            </Typography>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <Typography className="text-sm text-blue-gray-400">
                                        No objects defined
                                    </Typography>
                                )}
                            </div>
                        </DialogBody>

                        <DialogFooter>
                            <Button variant="outlined" color="light-blue" onClick={closeDetail}>
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </Dialog>
        </div>
    );
}

export default Scenes;
