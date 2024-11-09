import Image from "next/image";
import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { Button } from "./button";

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/img/gptr-logo.png"
              alt="GPT Researcher Logo"
              width={40}
              height={40}
              className="w-10 h-10 transition-transform hover:scale-105"
            />
            <span className="text-xl font-semibold text-gray-800">
              GPT Researcher
            </span>
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;