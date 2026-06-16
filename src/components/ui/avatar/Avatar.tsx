import Image from "next/image";
import React, { useState, useEffect } from "react";

interface AvatarProps {
  src: string; // URL of the avatar image
  alt?: string; // Alt text for the avatar
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge"; // Avatar size
  status?: "online" | "offline" | "busy" | "none"; // Status indicator
}

const sizeClasses = {
  xsmall: "h-6 w-6 max-w-6",
  small: "h-8 w-8 max-w-8",
  medium: "h-10 w-10 max-w-10",
  large: "h-12 w-12 max-w-12",
  xlarge: "h-25 w-25 max-w-25",
  xxlarge: "h-30 w-30 max-w-30",
};

const sizeValues = {
  xsmall: 24,
  small: 32,
  medium: 40,
  large: 48,
  xlarge: 100,
  xxlarge: 120,
};

const statusSizeClasses = {
  xsmall: "h-1.5 w-1.5 max-w-1.5",
  small: "h-2 w-2 max-w-2",
  medium: "h-2.5 w-2.5 max-w-2.5",
  large: "h-3 w-3 max-w-3",
  xlarge: "h-3.5 w-3.5 max-w-3.5",
  xxlarge: "h-4 w-4 max-w-4",
};

const statusColorClasses = {
  online: "bg-success-500",
  offline: "bg-error-400",
  busy: "bg-warning-500",
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User Avatar",
  size = "medium",
  status = "none",
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeValue = sizeValues[size];

  const handleImageError = () => {
    setImageError(true);
  };

  // Reset error when src changes to a non-empty value so new uploads can render
  useEffect(() => {
    if (typeof src === 'string' && src.trim().length > 0) {
      setImageError(false);
    }
  }, [src]);

  return (
    <div className={`relative rounded-full ${sizeClasses[size]} flex justify-center items-center`} style={{borderRadius: '50%'}}>
      {/* Avatar Image */}
      {(!imageError && typeof src === 'string' && src.trim().length > 0) ? (
        <Image
          width={sizeValue}
          height={sizeValue}
          src={src}
          alt={alt}
          className="object-cover w-full h-full rounded-full bg-transparent"
          onError={handleImageError}
          unoptimized={true}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
            {typeof alt === 'string' && alt.trim().length > 0 ? alt.trim().charAt(0).toUpperCase() : 'U'}
          </span>
        </div>
      )}

      {/* Status Indicator */}
      {status !== "none" && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-[1.5px] border-white dark:border-gray-900 ${
            statusSizeClasses[size]
          } ${statusColorClasses[status] || ""}`}
        ></span>
      )}
    </div>
  );
};

export default Avatar;