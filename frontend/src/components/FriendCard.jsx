import { Link } from "react-router";
import { LANGUAGE_TO_FLAG } from "../constants";
import { MapPinIcon, MessageSquareIcon } from "lucide-react";
import { capitialize } from "../lib/utils";

const FriendCard = ({ friend }) => {
  return (
    <div className="card bg-base-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-base-content/5 group">
      <div className="card-body p-5 space-y-4">
        {/* USER INFO */}
        <div className="flex items-center gap-3">
          <div className="avatar size-14 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300">
            <img 
              src={friend.profilePic || "https://api.dicebear.com/7.x/identicon/png?seed=default"} 
              alt={friend.fullName} 
              className="object-cover w-full h-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base truncate text-base-content group-hover:text-primary transition-colors">
              {friend.fullName}
            </h3>
            {friend.username ? (
              <p className="text-xs text-base-content/60 truncate">@{friend.username}</p>
            ) : (
              <p className="text-xs text-base-content/40 truncate italic">no username</p>
            )}
          </div>
        </div>

        {/* Location if exists */}
        {friend.location && (
          <div className="flex items-center text-xs opacity-75 text-base-content/85">
            <MapPinIcon className="size-3.5 mr-1 text-primary animate-pulse" />
            <span className="truncate">{friend.location}</span>
          </div>
        )}

        {/* Languages badges */}
        <div className="flex flex-wrap gap-1.5">
          {friend.nativeLanguage && (
            <span className="badge badge-secondary badge-sm py-2.5 font-medium text-xs">
              {getLanguageFlag(friend.nativeLanguage)}
              Native: {capitialize(friend.nativeLanguage)}
            </span>
          )}
          {friend.learningLanguage && (
            <span className="badge badge-outline badge-sm py-2.5 font-medium text-xs">
              {getLanguageFlag(friend.learningLanguage)}
              Learning: {capitialize(friend.learningLanguage)}
            </span>
          )}
        </div>

        {/* Bio status */}
        {friend.bio ? (
          <p className="text-xs text-base-content/75 line-clamp-2 italic h-8">
            "{friend.bio}"
          </p>
        ) : (
          <div className="h-8" />
        )}

        {/* Message Action Button */}
        <Link 
          to={`/chat/${friend._id}`} 
          className="btn btn-primary btn-sm sm:btn-md w-full gap-2 mt-2 group-hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
        >
          <MessageSquareIcon className="size-4" />
          <span>Message</span>
        </Link>
      </div>
    </div>
  );
};

export default FriendCard;

export function getLanguageFlag(language) {
  if (!language) return null;

  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];

  if (countryCode) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${countryCode}.png`}
        alt={`${langLower} flag`}
        className="h-3 mr-1 inline-block"
      />
    );
  }
  return null;
}