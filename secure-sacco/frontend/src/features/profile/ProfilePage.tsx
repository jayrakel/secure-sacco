import { useAuth } from "../auth/context/AuthProvider";
import { useState } from "react";
import apiClient from "../../shared/api/api-client";
import { Button } from "../../shared/components/ui/button";
import { Input } from "../../shared/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../shared/components/ui/card";

export const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) return;

        const formData = new FormData();
        formData.append("photo", selectedFile);

        try {
            await apiClient.post(`/users/${user.id}/profile-photo`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            await refreshUser();
            alert("Profile photo uploaded successfully!");
        } catch (error) {
            console.error("Error uploading profile photo:", error);
            alert("Failed to upload profile photo.");
        }
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <Card>
                <CardHeader>
                    <CardTitle>My Profile</CardTitle>
                    <CardDescription>Manage your profile information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <img
                            src={user.profilePhotoUrl || 'https://via.placeholder.com/150'}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover"
                        />
                        <div>
                            <h2 className="text-2xl font-bold">{user.firstName} {user.lastName}</h2>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Upload Profile Photo</h3>
                        <div className="flex items-center space-x-2 mt-2">
                            <Input type="file" onChange={handleFileChange} />
                            <Button onClick={handleUpload} disabled={!selectedFile}>
                                Upload
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};