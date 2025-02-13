"use client";

import React, { useState } from "react";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full bg-transparent z-50">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="text-white text-xl font-bold">BL</div>
        <button
          className="text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>
      {menuOpen && (
        <nav className="bg-black text-white p-4">
          <ul className="space-y-2">
            <li><a href="#hero">Hero Section</a></li>
            <li><a href="#acting">Acting Section</a></li>
            <li><a href="#voice">Voice Acting Section</a></li>
            <li><a href="#about">About Me Section</a></li>
            <li><a href="#contact">Contact Section</a></li>
          </ul>
        </nav>
      )}
    </header>
  );
};

export default Header;
