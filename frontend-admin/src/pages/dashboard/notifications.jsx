import React, { useState } from "react";
import {
  Typography,
  Card,
  CardHeader,
  CardBody,
  Input,
  Textarea,
  Button,
} from "@material-tailwind/react";
import axios from "axios";
import { toast } from "react-hot-toast";

export function Notifications() {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error("Title and message are required");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:3000/api/notifications/send", formData, {
        withCredentials: true,
      });
      if (response.data.success) {
        toast.success("Notification sent successfully!");
        setFormData({ title: "", message: "" });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error(error.response?.data?.error || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto my-10 flex max-w-screen-md flex-col gap-8">
      <Card>
        <CardHeader
          variant="gradient"
          color="blue"
          className="mb-8 p-6"
          style={{ background: "linear-gradient(135deg, rgb(14, 165, 233) 0%, rgb(99, 102, 241) 60%, rgb(139, 92, 246) 100%)" }}
        >
          <Typography variant="h6" color="white">
            Send Push Notification
          </Typography>
          <Typography variant="small" color="white" className="font-normal opacity-80">
            Send a notification to all users who have the game installed.
          </Typography>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Typography variant="small" color="blue-gray" className="font-medium">
                Notification Title
              </Typography>
              <Input
                size="lg"
                placeholder="Enter notification title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="!border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Typography variant="small" color="blue-gray" className="font-medium">
                Notification Message
              </Typography>
              <Textarea
                size="lg"
                placeholder="Enter notification message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="!border-t-blue-gray-200 focus:!border-t-gray-900"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
              />
            </div>
            <Button
              type="submit"
              color="blue"
              fullWidth
              className="mt-4"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default Notifications;
