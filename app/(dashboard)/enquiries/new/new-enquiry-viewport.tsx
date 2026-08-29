"use client";

import { useEffect } from "react";

export function NewEnquiryViewport() {
  useEffect(() => {
    const main = document.querySelector("main");
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousMainHeight = main?.style.height ?? "";
    const previousMainMinHeight = main?.style.minHeight ?? "";
    const previousMainOverflowY = main?.style.overflowY ?? "";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const setMobileWorkspaceHeight = () => {
      if (!main || window.matchMedia("(min-width: 1024px)").matches) {
        if (main) {
          main.style.height = previousMainHeight;
          main.style.minHeight = previousMainMinHeight;
          main.style.overflowY = previousMainOverflowY;
        }
        return;
      }

      main.style.height = `${window.innerHeight - main.getBoundingClientRect().top}px`;
      main.style.minHeight = "0";
      main.style.overflowY = "hidden";
    };

    setMobileWorkspaceHeight();
    window.addEventListener("resize", setMobileWorkspaceHeight);

    return () => {
      window.removeEventListener("resize", setMobileWorkspaceHeight);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      if (main) {
        main.style.height = previousMainHeight;
        main.style.minHeight = previousMainMinHeight;
        main.style.overflowY = previousMainOverflowY;
      }
    };
  }, []);

  return null;
}
