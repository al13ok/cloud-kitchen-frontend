import React, { FC, ReactNode, createContext, useContext, useState, useEffect } from "react";

interface TooltipContextType {
  content: string | ReactNode;
  position: "top" | "right" | "bottom" | "left";
  setContent: (content: string | ReactNode) => void;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

interface TooltipProps {
  children: ReactNode;
  content?: string | ReactNode;
  position?: "top" | "right" | "bottom" | "left";
}

interface TooltipProviderProps {
  children: ReactNode;
}

interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

interface TooltipContentProps {
  children?: ReactNode;
}

const Tooltip: FC<TooltipProps> = ({ children, content, position = "top" }) => {
  const [tooltipContent, setTooltipContent] = useState<string | ReactNode>(content || '');
  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 transform -translate-x-1/2 border-t-gray-900",
    right: "left-full top-1/2 transform -translate-y-1/2 border-r-gray-900",
    bottom: "bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900",
    left: "right-full top-1/2 transform -translate-y-1/2 border-l-gray-900",
  };

  // If content prop is provided, use simple tooltip
  if (content) {
    return (
      <div className="relative inline-block group">
        {children}
        <div
          className={`absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 ${positionClasses[position]}`}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
          ></div>
        </div>
      </div>
    );
  }

  // Otherwise, use compound component pattern
  return (
    <TooltipContext.Provider value={{ content: tooltipContent, position, setContent: setTooltipContent }}>
      <div className="relative inline-block group">
        {children}
        {tooltipContent && (
          <div
            className={`absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-300 ${positionClasses[position]}`}
            role="tooltip"
          >
            {tooltipContent}
            <div
              className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
            ></div>
          </div>
        )}
      </div>
    </TooltipContext.Provider>
  );
};

export const TooltipProvider: FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export const TooltipTrigger: FC<TooltipTriggerProps> = ({ children, asChild }) => {
  const context = useContext(TooltipContext);
  if (!context) {
    return <>{children}</>;
  }
  
  // Clone children to add tooltip wrapper
  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(childElement, {
      className: `${childElement.props.className || ''} cursor-pointer`
    });
  }
  
  return <div className="inline-block">{children}</div>;
};

export const TooltipContent: FC<TooltipContentProps> = ({ children }) => {
  const context = useContext(TooltipContext);
  
  useEffect(() => {
    if (context && children) {
      context.setContent(children);
    }
    return () => {
      if (context) {
        context.setContent('');
      }
    };
  }, [children, context]);

  return null;
};

export default Tooltip;
