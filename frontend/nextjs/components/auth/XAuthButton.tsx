import { Button } from "@/components/ui/button"

interface XSignInButtonProps {
  onClick: () => void;
}

export default function XSignInButton({ onClick }: XSignInButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="w-10 h-10 rounded-full border-gray-300 bg-black hover:bg-black/90 focus:ring-blue-500 focus:border-blue-500"
      onClick={onClick}
    >
      <svg
        className="w-5 h-5 text-white"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153ZM17.61 20.644h2.039L6.486 3.24H4.298l13.312 17.404Z"
          fill="currentColor"
        />
      </svg>
      <span className="sr-only">Sign in with X</span>
    </Button>
  )
}