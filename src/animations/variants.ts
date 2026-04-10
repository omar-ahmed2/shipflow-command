import { Variants } from "framer-motion";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { opacity: 0, y: -8, filter: "blur(2px)", transition: { duration: 0.2 } }
};

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.97 },
  animate: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" }
  })
};

export const menuItemVariants: Variants = {
  initial: { opacity: 0, x: -16 },
  animate: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.05, duration: 0.3 }
  })
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: [0.34, 1.56, 0.64, 1] } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.18 } }
};

export const bottomSheetVariants: Variants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { type: "spring", damping: 28, stiffness: 300 } },
  exit: { y: "100%", transition: { duration: 0.22 } }
};

export const badgePulse = {
  animate: { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 2 } }
};

export const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
};
