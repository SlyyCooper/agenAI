import * as React from "react"
import { ArrowRight } from "lucide-react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  showArrow?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", showArrow = false, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-full font-semibold transition-colors"
    
    const variantStyles = {
      default: "bg-black text-white hover:bg-gray-800",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-gray-300 bg-transparent hover:bg-gray-100",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
      ghost: "bg-transparent hover:bg-gray-100",
      link: "bg-transparent text-blue-600 hover:text-blue-800 underline"
    }

    const sizeStyles = {
      default: "px-4 py-2 text-sm",
      sm: "px-3 py-1 text-xs",
      lg: "px-6 py-3 text-base",
      icon: "p-2"
    }

        function cn(baseStyles: string, arg1: string, arg2: string, className: string | undefined): string | undefined {
            throw new Error("Function not implemented.")
        }

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        {showArrow && <ArrowRight className="ml-2 h-5 w-5" />}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }