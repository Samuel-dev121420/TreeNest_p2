import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function PageShell({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-soft pb-32">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto w-full max-w-3xl px-5 pt-10"
      >
        {title ? (
          <motion.header variants={itemVariants}>
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
          </motion.header>
        ) : null}
        <motion.div variants={itemVariants} className={title ? "mt-8" : ""}>
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

export function ComingSoon({ note }: { note: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-border/70 bg-card p-8 text-center shadow-soft"
    >
      <p className="text-sm text-muted-foreground">{note}</p>
    </motion.div>
  );
}

