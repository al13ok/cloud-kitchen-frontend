import React, { useState, useRef, KeyboardEvent, useEffect } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  id?: string;
  name?: string;
  placeholder?: string;
  tags?: string[];
  value?: string[];
  onChange?: (tags: string[]) => void;
  onTagsChange?: (tags: string[]) => void;
  className?: string;
  disabled?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
  id,
  name,
  placeholder = "Type and press Enter",
  tags = [],
  value = [],
  onChange,
  onTagsChange,
  className = "",
  disabled = false,
}) => {
  // Use tags prop if provided, otherwise use value prop
  const currentTags = tags.length > 0 ? tags : value;
  const handleChange = onTagsChange || onChange || (() => {});
  
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === "Backspace" && inputValue === "" && currentTags.length > 0) {
      // Remove the last tag when backspace is pressed on empty input
      removeTag(currentTags.length - 1);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !currentTags.includes(tag)) {
      handleChange([...currentTags, tag]);
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    const newTags = [...currentTags];
    newTags.splice(index, 1);
    handleChange(newTags);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const pastedTags = paste.split(",").map(tag => tag.trim()).filter(tag => tag);
    
    if (pastedTags.length > 0) {
      const newTags = [...currentTags];
      pastedTags.forEach(tag => {
        if (tag && !newTags.includes(tag)) {
          newTags.push(tag);
        }
      });
      handleChange(newTags);
      setInputValue("");
    }
  };

  return (
    <div className={className}>
      {/* Input field */}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onPaste={handlePaste}
        placeholder={currentTags.length === 0 ? placeholder : ""}
        disabled={disabled}
        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
      />
      
      {/* Tags container - displayed below the input */}
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {currentTags.map((tag, index) => (
            <div 
              key={index} 
              className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  aria-label={`Remove ${tag}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;

