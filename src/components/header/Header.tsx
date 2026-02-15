import React from "react";

function Header({ children }: { children: React.ReactNode }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
      <div className="flex items-center justify-between">{children}</div>
    </header>
  );
}

export default Header;
