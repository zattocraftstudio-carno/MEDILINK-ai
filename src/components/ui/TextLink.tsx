import React from "react";
import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";

export interface TextLinkProps {
  href?: string;
  onClick?: () => void;
  arrow?: boolean | "right" | "down";
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}

export const TextLink: React.FC<TextLinkProps> = ({
  href,
  onClick,
  arrow = false,
  children,
  className = "",
  external = false,
}) => {
  const commonClasses = `inline-flex items-center gap-1.5 text-sm md:text-[15px] font-semibold text-brand hover:underline transition-colors focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 select-none group cursor-pointer ${className}`;

  const renderArrow = () => {
    if (!arrow) return null;
    if (arrow === "down") {
      return (
        <ArrowDown
          className="w-4 h-4 shrink-0 text-brand transition-transform duration-160 group-hover:translate-y-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
      );
    }
    return (
      <ArrowRight
        className="w-4 h-4 shrink-0 text-brand transition-transform duration-160 group-hover:translate-x-0.5"
        strokeWidth={2}
        aria-hidden="true"
      />
    );
  };

  if (href) {
    if (external || href.startsWith("tel:") || href.startsWith("mailto:") || href.startsWith("sms:") || href.startsWith("http")) {
      return (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className={commonClasses}
        >
          <span>{children}</span>
          {renderArrow()}
        </a>
      );
    }

    return (
      <Link href={href} className={commonClasses}>
        <span>{children}</span>
        {renderArrow()}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={commonClasses}>
      <span>{children}</span>
      {renderArrow()}
    </button>
  );
};
