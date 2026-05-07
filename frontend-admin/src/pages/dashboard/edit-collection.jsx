import { useState, useEffect } from "react";
import {
    Card,
    CardHeader,
    CardBody,
    Typography,
    Input,
    Button,
    Textarea,
    Spinner,
} from "@material-tailwind/react";
import { PencilIcon, FolderIcon, ArrowUpTrayIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import { useNavigate, useParams } from "react-router-dom";
import { getCollection, updateCollection } from "@/services/collectionService";
import toast from "react-hot-toast";

export function EditCollection() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form fields
    const [collectionName, setCollectionName] = useState("");
    const [description, setDescription] = useState("");
    const [thumbnail, setThumbnail] = useState(null);
    const [existingThumbnailUrl, setExistingThumbnailUrl] = useState("");

    useEffect(() => {
        const fetchCollectionData = async () => {
            try {
                const result = await getCollection(id);
                if (result.success) {
                    const { collectionName, description, thumbnailUrl } = result.collection;
                    setCollectionName(collectionName || "");
                    setDescription(description || "");
                    setExistingThumbnailUrl(thumbnailUrl || "");
                } else {
                    toast.error("Failed to fetch collection data");
                    navigate("/dashboard/collections");
                }
            } catch (error) {
                toast.error(error.response?.data?.message || "Error fetching collection data");
                navigate("/dashboard/collections");
            } finally {
                setFetching(false);
            }
        };

        fetchCollectionData();
    }, [id, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!collectionName.trim()) return toast.error("Collection name is required");

        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("collectionName", collectionName.trim());
            formData.append("description", description.trim());
            if (thumbnail) {
                formData.append("thumbnail", thumbnail);
            }

            const result = await updateCollection(id, formData);

            if (result.success) {
                toast.success(result.message || "Collection updated successfully!");
                navigate("/dashboard/collections");
            } else {
                toast.error(result.message || "Failed to update collection");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update collection");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex justify-center items-center py-16">
                <Spinner color="light-blue" className="h-8 w-8" />
                <Typography className="ml-3 text-blue-gray-500">
                    Loading collection data...
                </Typography>
            </div>
        );
    }

    return (
        <div className="mt-12 mb-8">
            <div className="mb-6 flex items-center justify-between">
                <Button
                    variant="text"
                    color="blue-gray"
                    className="flex items-center gap-2"
                    onClick={() => navigate("/dashboard/collections")}
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Collections
                </Button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-8">
                    <Card>
                        <CardHeader
                            variant="gradient"
                            color="light-blue"
                            className="p-5 flex items-center gap-3"
                        >
                            <FolderIcon className="h-6 w-6 text-white" />
                            <Typography variant="h6" color="white">
                                Edit Collection: {collectionName}
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
                                    existingUrl={existingThumbnailUrl}
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
                            {loading ? "Updating..." : (
                                <>
                                    <PencilIcon className="h-4 w-4" />
                                    Update Collection
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function FileUploadCard({ label, file, onFileChange, existingUrl, accept }) {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setPreview(null);
        }
    }, [file]);

    return (
        <div className="text-center w-full md:w-1/3">
            <label className="group cursor-pointer">
                <div className="h-48 rounded-lg border-2 border-dashed border-blue-gray-100 bg-blue-gray-50/30 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-light-blue-300 hover:bg-light-blue-50/20">
                    {preview ? (
                        <img src={preview} alt={label} className="h-full w-full object-contain p-2" />
                    ) : existingUrl && !file ? (
                        <img src={existingUrl} alt={label} className="h-full w-full object-contain p-2 opacity-70" />
                    ) : (
                        <div className="text-center px-4">
                            <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-blue-gray-300 group-hover:text-light-blue-400 transition-colors" />
                            <Typography className="text-sm text-blue-gray-400 mt-2">
                                Change {label}
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
                    Revert to Existing
                </Button>
            )}
        </div>
    );
}

export default EditCollection;
