import { motion } from "framer-motion";

// Fade up/down variants used by all three wrappers — cards rise into view and fade out.
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

// Stagger — children animate in one after another instead of all at once.
const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

// Page-level wrapper — fades content up on enter, down on exit (works with AnimatePresence).
export function PageTransition({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeUp}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Container that staggers its children — each child enters with a small delay after the previous one.
export function StaggerContainer({ children, ...props }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Single item inside a StaggerContainer — same fade-up animation but delayed by the container.
export function StaggerItem({ children, ...props }) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.3, ease: "easeOut" }} {...props}>
      {children}
    </motion.div>
  );
}
