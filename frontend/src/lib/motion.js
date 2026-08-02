import { motion } from "framer-motion";

export const easeOut = [0.22, 1, 0.36, 1];

export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOut, delay: i * 0.08 },
  }),
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

// Section-level scroll reveal wrapper
export const Reveal = ({ children, className = "", delay = 0, y = 30 }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7, ease: easeOut, delay }}
  >
    {children}
  </motion.div>
);
