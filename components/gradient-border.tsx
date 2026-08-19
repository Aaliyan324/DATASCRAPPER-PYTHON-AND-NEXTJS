import React from "react";

interface GradientBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export function GradientBorder({
  children,
  className = "",
  innerClassName = "",
  ...props
}: GradientBorderProps) {
  return (
    <div
      className={`p-[1.33px] rounded-[6px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-tertiary)] shadow-default-custom transition-all duration-300 hover:shadow-lg ${className}`}
      {...props}
    >
      <div
        className={`bg-black text-white rounded-[4.67px] p-[12px] h-full ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
