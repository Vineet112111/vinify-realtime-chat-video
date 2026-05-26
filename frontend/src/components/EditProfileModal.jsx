import { useState, useEffect } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useStreamStore } from "../store/useStreamStore";
import { updateProfile } from "../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { LANGUAGES } from "../constants";
import { CameraIcon, MapPinIcon, UserIcon, LoaderIcon, BellIcon, XIcon, SaveIcon } from "lucide-react";

const EditProfileModal = () => {
  const { authUser } = useAuthUser();
  const queryClient = useQueryClient();
  const { 
    isProfileModalOpen, 
    setProfileModalOpen, 
    notificationsEnabled, 
    setNotificationsEnabled 
  } = useStreamStore();

  const [formState, setFormState] = useState({
    fullName: "",
    username: "",
    bio: "",
    nativeLanguage: "",
    learningLanguage: "",
    location: "",
    profilePic: "",
  });

  // Populate initial values when modal opens
  useEffect(() => {
    if (authUser) {
      setFormState({
        fullName: authUser.fullName || "",
        username: authUser.username || "",
        bio: authUser.bio || "",
        nativeLanguage: authUser.nativeLanguage || "",
        learningLanguage: authUser.learningLanguage || "",
        location: authUser.location || "",
        profilePic: authUser.profilePic || "",
      });
    }
  }, [authUser, isProfileModalOpen]);

  const { mutate: updateProfileMutation, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      setProfileModalOpen(false);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState((prev) => ({ ...prev, profilePic: reader.result }));
        toast.success("Profile photo loaded! Click Save to apply.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formState.fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    updateProfileMutation(formState);
  };

  if (!isProfileModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-base-200 border border-base-content/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-fade-in">
        {/* Modal Header */}
        <div className="p-4 bg-primary text-primary-content flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserIcon className="size-5" />
            Edit Profile & Settings
          </h2>
          <button 
            onClick={() => setProfileModalOpen(false)}
            className="btn btn-ghost btn-circle btn-sm text-primary-content hover:bg-black/10"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Avatar Upload Block */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="size-32 rounded-full ring-4 ring-primary overflow-hidden bg-base-300 relative">
                {formState.profilePic ? (
                  <img 
                    src={formState.profilePic} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-base-content/50">
                    <UserIcon className="size-16" />
                  </div>
                )}
                
                {/* Upload Overlay */}
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs transition-opacity duration-200 cursor-pointer">
                  <CameraIcon className="size-6 mb-1" />
                  Change Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <p className="text-xs opacity-60">Supports JPG, PNG (Max 2MB)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FULL NAME */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Name</span>
              </label>
              <input
                type="text"
                value={formState.fullName}
                onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                className="input input-bordered w-full"
                placeholder="Full Name"
                required
              />
            </div>

            {/* USERNAME */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Username</span>
              </label>
              <input
                type="text"
                value={formState.username}
                onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                className="input input-bordered w-full"
                placeholder="username"
              />
            </div>
          </div>

          {/* BIO */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Bio / Status</span>
            </label>
            <textarea
              value={formState.bio}
              onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
              className="textarea textarea-bordered h-20"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NATIVE LANGUAGE */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Native Language</span>
              </label>
              <select
                value={formState.nativeLanguage}
                onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
                className="select select-bordered w-full"
              >
                <option value="">Select language</option>
                {LANGUAGES.map((lang) => (
                  <option key={`native-${lang}`} value={lang.toLowerCase()}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* LEARNING LANGUAGE */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Learning Language</span>
              </label>
              <select
                value={formState.learningLanguage}
                onChange={(e) => setFormState({ ...formState, learningLanguage: e.target.value })}
                className="select select-bordered w-full"
              >
                <option value="">Select language</option>
                {LANGUAGES.map((lang) => (
                  <option key={`learning-${lang}`} value={lang.toLowerCase()}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LOCATION */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Location</span>
            </label>
            <div className="relative">
              <MapPinIcon className="absolute top-1/2 -translate-y-1/2 left-3 size-4 opacity-75" />
              <input
                type="text"
                value={formState.location}
                onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                className="input input-bordered w-full pl-9"
                placeholder="City, Country"
              />
            </div>
          </div>

          {/* NOTIFICATION SETTINGS */}
          <div className="bg-base-300/40 p-4 rounded-xl space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2 text-base-content/95">
              <BellIcon className="size-4 text-primary" />
              Notification Settings
            </h3>
            <div className="form-control">
              <label className="label cursor-pointer justify-between gap-4">
                <span className="label-text text-sm">
                  Enable Message Alerts
                  <span className="block text-xs opacity-60">Play sounds and display push notifications</span>
                </span>
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="toggle toggle-primary"
                />
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-base-content/10">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="btn btn-outline btn-sm sm:btn-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-sm sm:btn-md gap-2"
            >
              {isPending ? (
                <>
                  <LoaderIcon className="animate-spin size-4" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="size-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
