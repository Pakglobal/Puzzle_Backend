import { useState } from "react";
import {
    Card,
    CardHeader,
    CardBody,
    Typography,
    Input,
    Button,
    IconButton,
    Tooltip,
    Chip,
} from "@material-tailwind/react";
import {
    PlusIcon,
    TrashIcon,
    PhotoIcon,
    ArrowUpTrayIcon,
    PuzzlePieceIcon,
    CubeIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import { createScene } from "@/services/sceneService";
import toast from "react-hot-toast";

export function CreateScene() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // ── Basic Info ──
    const [collectionId, setCollectionId] = useState("");
    const [sceneName, setSceneName] = useState("");
    const [height, setHeight] = useState("");
    const [width, setWidth] = useState("");

    // ── Main Files ──
    const [originalImage, setOriginalImage] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [finalLottie, setFinalLottie] = useState(null);

    // ── Levels ──
    const [levels, setLevels] = useState([{ image: null }]);

    // ── Objects ──
    const [objects, setObjects] = useState([
        { levelId: 0, x: "", y: "", width: "", height: "", image: null },
    ]);

    // ─── LEVEL HELPERS ───
    const addLevel = () => setLevels([...levels, { image: null }]);

    const removeLevel = (index) => {
        if (levels.length <= 1) return toast.error("At least 1 level is required");
        setLevels(levels.filter((_, i) => i !== index));
    };

    const setLevelImage = (index, file) => {
        const updated = [...levels];
        updated[index].image = file;
        setLevels(updated);
    };

    // ─── OBJECT HELPERS ───
    const addObject = () =>
        setObjects([
            ...objects,
            { levelId: 0, x: "", y: "", width: "", height: "", image: null },
        ]);

    const removeObject = (index) => {
        if (objects.length <= 1) return toast.error("At least 1 object is required");
        setObjects(objects.filter((_, i) => i !== index));
    };

    const updateObject = (index, field, value) => {
        const updated = [...objects];
        updated[index][field] = value;
        setObjects(updated);
    };

    const setObjectImage = (index, file) => {
        const updated = [...objects];
        updated[index].image = file;
        setObjects(updated);
    };

    // ─── SUBMIT ───
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!collectionId.trim()) return toast.error("Collection ID is required");
        if (!sceneName.trim()) return toast.error("Scene name is required");
        if (!height || !width) return toast.error("Height and width are required");

        setLoading(true);

        try {
            // Build the sceneData JSON
            const sceneData = {
                sceneName: sceneName.trim(),
                height: parseInt(height),
                width: parseInt(width),
                levels: levels.map(() => ({})), // empty objects, backend assigns IDs
                objects: objects.map((obj) => ({
                    levelId: parseInt(obj.levelId),
                    x: parseFloat(obj.x),
                    y: parseFloat(obj.y),
                    width: parseFloat(obj.width),
                    height: parseFloat(obj.height),
                })),
            };

            // Build FormData
            const formData = new FormData();
            formData.append("sceneData", JSON.stringify(sceneData));

            // Main files
            if (originalImage) formData.append("originalImage", originalImage);
            if (previewImage) formData.append("previewImage", previewImage);
            if (finalLottie) formData.append("finalLottie", finalLottie);

            // Level images
            levels.forEach((lvl) => {
                if (lvl.image) formData.append("levelImages", lvl.image);
            });

            // Object images
            objects.forEach((obj) => {
                if (obj.image) formData.append("objectImages", obj.image);
            });

            const result = await createScene(collectionId.trim(), formData);

            if (result.success) {
                toast.success(result.message || "Scene created successfully!");
                navigate("/dashboard/scenes");
            } else {
                toast.error(result.message || "Failed to create scene");
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to create scene"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-12 mb-8">
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-8">

                    {/* ═══════════ SECTION 1: BASIC INFO ═══════════ */}
                    <Card>
                        <CardHeader
                            variant="gradient"
                            color="light-blue"
                            className="p-5 flex items-center gap-3"
                        >
                            <PuzzlePieceIcon className="h-6 w-6 text-white" />
                            <Typography variant="h6" color="white">
                                Scene Details
                            </Typography>
                        </CardHeader>
                        <CardBody className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Collection ID"
                                    value={collectionId}
                                    onChange={(e) => setCollectionId(e.target.value)}
                                    required
                                    color="light-blue"
                                />
                                <Input
                                    label="Scene Name"
                                    value={sceneName}
                                    onChange={(e) => setSceneName(e.target.value)}
                                    required
                                    color="light-blue"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Width (px)"
                                    type="number"
                                    value={width}
                                    onChange={(e) => setWidth(e.target.value)}
                                    required
                                    color="light-blue"
                                />
                                <Input
                                    label="Height (px)"
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    required
                                    color="light-blue"
                                />
                            </div>
                        </CardBody>
                    </Card>

                    {/* ═══════════ SECTION 2: MAIN FILES ═══════════ */}
                    <Card>
                        <CardHeader
                            variant="gradient"
                            color="light-blue"
                            className="p-5 flex items-center gap-3"
                        >
                            <PhotoIcon className="h-6 w-6 text-white" />
                            <Typography variant="h6" color="white">
                                Scene Images
                            </Typography>
                        </CardHeader>
                        <CardBody>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Original Image */}
                                <FileUploadCard
                                    label="Original Image"
                                    file={originalImage}
                                    onFileChange={setOriginalImage}
                                    accept="image/*"
                                />
                                {/* Preview Image */}
                                <FileUploadCard
                                    label="Preview Image"
                                    file={previewImage}
                                    onFileChange={setPreviewImage}
                                    accept="image/*"
                                />
                                {/* Final Lottie */}
                                <FileUploadCard
                                    label="Final Lottie / GIF"
                                    file={finalLottie}
                                    onFileChange={setFinalLottie}
                                    accept="image/*,.gif,.json"
                                />
                            </div>
                        </CardBody>
                    </Card>

                    {/* ═══════════ SECTION 3: LEVELS ═══════════ */}
                    <Card>
                        <CardHeader
                            variant="gradient"
                            color="light-blue"
                            className="p-5 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <CubeIcon className="h-6 w-6 text-white" />
                                <Typography variant="h6" color="white">
                                    Levels
                                </Typography>
                                <Chip
                                    value={levels.length}
                                    variant="ghost"
                                    color="white"
                                    className="text-white border-white/30"
                                />
                            </div>
                            <Button
                                size="sm"
                                color="white"
                                variant="text"
                                className="flex items-center gap-1"
                                onClick={addLevel}
                                type="button"
                            >
                                <PlusIcon className="h-4 w-4" /> Add Level
                            </Button>
                        </CardHeader>
                        <CardBody>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {levels.map((lvl, i) => (
                                    <div
                                        key={i}
                                        className="relative rounded-lg border border-blue-gray-100 p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <Chip
                                                value={`Level ${i + 1}`}
                                                variant="ghost"
                                                color="light-blue"
                                                className="text-xs"
                                            />
                                            <Tooltip content="Remove Level">
                                                <IconButton
                                                    variant="text"
                                                    color="red"
                                                    size="sm"
                                                    onClick={() => removeLevel(i)}
                                                    type="button"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                        <FileUploadCard
                                            label={`Level ${i + 1} Image`}
                                            file={lvl.image}
                                            onFileChange={(file) => setLevelImage(i, file)}
                                            accept="image/*"
                                            compact
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>

                    {/* ═══════════ SECTION 4: OBJECTS ═══════════ */}
                    <Card>
                        <CardHeader
                            variant="gradient"
                            color="light-blue"
                            className="p-5 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <PuzzlePieceIcon className="h-6 w-6 text-white" />
                                <Typography variant="h6" color="white">
                                    Objects
                                </Typography>
                                <Chip
                                    value={objects.length}
                                    variant="ghost"
                                    color="white"
                                    className="text-white border-white/30"
                                />
                            </div>
                            <Button
                                size="sm"
                                color="white"
                                variant="text"
                                className="flex items-center gap-1"
                                onClick={addObject}
                                type="button"
                            >
                                <PlusIcon className="h-4 w-4" /> Add Object
                            </Button>
                        </CardHeader>
                        <CardBody>
                            <div className="flex flex-col gap-4">
                                {objects.map((obj, i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-blue-gray-100 p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <Chip
                                                value={`Object ${i + 1}`}
                                                variant="ghost"
                                                color="light-blue"
                                                className="text-xs"
                                            />
                                            <Tooltip content="Remove Object">
                                                <IconButton
                                                    variant="text"
                                                    color="red"
                                                    size="sm"
                                                    onClick={() => removeObject(i)}
                                                    type="button"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                            <Input
                                                label="Level ID"
                                                type="number"
                                                value={obj.levelId}
                                                onChange={(e) =>
                                                    updateObject(i, "levelId", e.target.value)
                                                }
                                                color="light-blue"
                                                containerProps={{ className: "min-w-0" }}
                                            />
                                            <Input
                                                label="X"
                                                type="number"
                                                step="0.01"
                                                value={obj.x}
                                                onChange={(e) => updateObject(i, "x", e.target.value)}
                                                color="light-blue"
                                                containerProps={{ className: "min-w-0" }}
                                            />
                                            <Input
                                                label="Y"
                                                type="number"
                                                step="0.01"
                                                value={obj.y}
                                                onChange={(e) => updateObject(i, "y", e.target.value)}
                                                color="light-blue"
                                                containerProps={{ className: "min-w-0" }}
                                            />
                                            <Input
                                                label="Width"
                                                type="number"
                                                step="0.01"
                                                value={obj.width}
                                                onChange={(e) =>
                                                    updateObject(i, "width", e.target.value)
                                                }
                                                color="light-blue"
                                                containerProps={{ className: "min-w-0" }}
                                            />
                                            <Input
                                                label="Height"
                                                type="number"
                                                step="0.01"
                                                value={obj.height}
                                                onChange={(e) =>
                                                    updateObject(i, "height", e.target.value)
                                                }
                                                color="light-blue"
                                                containerProps={{ className: "min-w-0" }}
                                            />
                                            <div className="min-w-0">
                                                <label className="flex h-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-blue-gray-200 px-2 py-1 text-xs text-blue-gray-400 transition-colors hover:border-light-blue-300 hover:text-light-blue-500">
                                                    <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                                    {obj.image ? (
                                                        <span className="truncate max-w-[60px]">
                                                            {obj.image.name}
                                                        </span>
                                                    ) : (
                                                        "Image"
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) =>
                                                            setObjectImage(i, e.target.files[0])
                                                        }
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>

                    {/* ═══════════ SUBMIT ═══════════ */}
                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outlined"
                            color="blue-gray"
                            onClick={() => navigate("/dashboard/scenes")}
                            type="button"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="light-blue"
                            className="flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                "Creating..."
                            ) : (
                                <>
                                    <PlusIcon className="h-4 w-4" />
                                    Create Scene
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

/* ═══════════════════════════════════════════
   REUSABLE FILE UPLOAD CARD
   ═══════════════════════════════════════════ */
function FileUploadCard({ label, file, onFileChange, accept, compact }) {
    const preview =
        file && file.type?.startsWith("image/")
            ? URL.createObjectURL(file)
            : null;

    return (
        <div className="text-center">
            {!compact && (
                <Typography
                    variant="small"
                    className="mb-2 font-medium text-blue-gray-500"
                >
                    {label}
                </Typography>
            )}
            <label className="group cursor-pointer">
                <div
                    className={`${compact ? "h-24" : "h-36"
                        } rounded-lg border-2 border-dashed border-blue-gray-100 bg-blue-gray-50/30 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-light-blue-300 hover:bg-light-blue-50/20`}
                >
                    {preview ? (
                        <img
                            src={preview}
                            alt={label}
                            className="h-full w-full object-contain p-1"
                        />
                    ) : file ? (
                        <div className="text-center px-2">
                            <ArrowUpTrayIcon className="mx-auto h-6 w-6 text-light-blue-400" />
                            <Typography className="text-xs text-blue-gray-400 mt-1 truncate max-w-[120px]">
                                {file.name}
                            </Typography>
                        </div>
                    ) : (
                        <div className="text-center px-2">
                            <ArrowUpTrayIcon className="mx-auto h-6 w-6 text-blue-gray-300 group-hover:text-light-blue-400 transition-colors" />
                            <Typography className="text-xs text-blue-gray-400 mt-1">
                                {compact ? "Upload" : `Upload ${label}`}
                            </Typography>
                        </div>
                    )}
                </div>
                <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files[0] || null)}
                />
            </label>
            {file && (
                <Button
                    size="sm"
                    variant="text"
                    color="red"
                    className="mt-1 text-xs px-2 py-1"
                    onClick={(e) => {
                        e.preventDefault();
                        onFileChange(null);
                    }}
                    type="button"
                >
                    Remove
                </Button>
            )}
        </div>
    );
}

export default CreateScene;
