import { useState } from "react";
import {
    Card,
    CardHeader,
    CardBody,
    Typography,
    Input,
    Button,
    Textarea,
} from "@material-tailwind/react";
import { PlusIcon, FolderIcon, ArrowUpTrayIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import { createCollection } from "@/services/collectionService";
import toast from "react-hot-toast";

export function CreateCollection() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form fields
    const [collectionName, setCollectionName] = useState("");
    const [description, setDescription] = useState("");
    const [thumbnail, setThumbnail] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!collectionName.trim()) return toast.error("Collection name is required");
        if (!thumbnail) return toast.error("Thumbnail image is required");

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("collectionName", collectionName.trim());
            formData.append("description", description.trim());
            formData.append("thumbnail", thumbnail);

            const result = await createCollection(formData);

            if (result.success) {
                toast.success(result.message || "Collection created successfully!");
                navigate("/dashboard/collections");
            } else {
                toast.error(result.message || "Failed to create collection");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create collection");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-12 mb-8">
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-8">
                    <Card>
                        <CardHeader
                            variant="gradient"
                            color="light-blue"
                            className="p-5 flex items-center gap-3"
                            style={{
                                background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 60%, #8b5cf6 100%)",
                            }}
                        >
                            <FolderIcon className="h-6 w-6 text-white" />
                            <Typography variant="h6" color="white">
                                Collection Details
                            </Typography>
                        </CardHeader>
                        <CardBody className="flex flex-col gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Input
                                    label="Collection Name"
                                    value={collectionName}
                                    onChange={(e) => setCollectionName(e.target.value)}
                                    required
                                    color="light-blue"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-5">
                                <Textarea
                                    label="Description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    color="light-blue"
                                />
                            </div>

                            <div>
                                <Typography variant="h6" color="blue-gray" className="mb-3">
                                    Thumbnail Image
                                </Typography>
                                <FileUploadCard
                                    label="Thumbnail"
                                    file={thumbnail}
                                    onFileChange={setThumbnail}
                                    accept="image/*"
                                />
                            </div>
                        </CardBody>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="outlined"
                            color="blue-gray"
                            onClick={() => navigate("/dashboard/collections")}
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
                            {loading ? "Creating..." : (
                                <>
                                    <PlusIcon className="h-4 w-4" />
                                    Create Collection
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function FileUploadCard({ label, file, onFileChange, accept }) {
    const preview = file && file.type?.startsWith("image/") ? URL.createObjectURL(file) : null;

    return (
        <div className="text-center w-full md:w-1/3">
            <label className="group cursor-pointer">
                <div className="h-48 rounded-lg border-2 border-dashed border-blue-gray-100 bg-blue-gray-50/30 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-light-blue-300 hover:bg-light-blue-50/20">
                    {preview ? (
                        <img src={preview} alt={label} className="h-full w-full object-contain p-2" />
                    ) : file ? (
                        <div className="text-center px-4">
                            <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-light-blue-400" />
                            <Typography className="text-sm text-blue-gray-400 mt-2 truncate w-full">
                                {file.name}
                            </Typography>
                        </div>
                    ) : (
                        <div className="text-center px-4">
                            <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-blue-gray-300 group-hover:text-light-blue-400 transition-colors" />
                            <Typography className="text-sm text-blue-gray-400 mt-2">
                                Upload {label}
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
                    className="mt-2 text-xs"
                    onClick={() => onFileChange(null)}
                    type="button"
                >
                    Remove
                </Button>
            )}
        </div>
    );
}

export default CreateCollection;
