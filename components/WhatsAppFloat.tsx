"use client";
import React from "react";

const WHATSAPP_NUMBER = "256757588585"; // +256 757588585

export default function WhatsAppFloat() {
  const handleClick = () => {
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello! I need support with NicholMoviesUg.")}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Chat with support on WhatsApp"
      title="Chat with support on WhatsApp"
      className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95 focus:outline-none"
      style={{ background: "#25D366" }}
    >
      {/* WhatsApp SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="w-8 h-8"
        fill="white"
      >
        <path d="M16 2C8.268 2 2 8.268 2 16c0 2.52.665 4.924 1.936 7.04L2 30l7.17-1.876A13.938 13.938 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5c-2.32 0-4.6-.63-6.59-1.82l-.47-.27-4.26 1.12 1.13-4.12-.3-.48A11.48 11.48 0 014.5 16C4.5 9.596 9.596 4.5 16 4.5S27.5 9.596 27.5 16 22.404 27.5 16 27.5zm6.23-8.3c-.34-.17-2-.99-2.31-1.1-.31-.11-.54-.17-.77.17-.23.34-.88 1.1-1.08 1.33-.2.23-.4.26-.74.09-.34-.17-1.44-.53-2.74-1.68-1.01-.9-1.7-2.01-1.9-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.77-1.86-1.06-2.55-.28-.67-.56-.58-.77-.59l-.65-.01c-.23 0-.6.09-.91.43-.31.34-1.19 1.16-1.19 2.83 0 1.67 1.22 3.29 1.39 3.52.17.23 2.4 3.67 5.82 5.14.81.35 1.44.56 1.93.72.81.26 1.55.22 2.14.13.65-.1 2-.82 2.28-1.6.28-.78.28-1.45.2-1.6-.09-.14-.31-.23-.65-.4z" />
      </svg>

      {/* Pulse ring animation */}
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-40"
        style={{ background: "#25D366" }}
      />
    </button>
  );
}
