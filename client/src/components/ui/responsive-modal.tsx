import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function ResponsiveModal({ open, onOpenChange, children }: ResponsiveModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {children}
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {children}
    </Drawer>
  );
}

interface ResponsiveModalContentProps {
  children: React.ReactNode;
  className?: string;
}

function ResponsiveModalContent({ children, className }: ResponsiveModalContentProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <DialogContent className={cn("glass-card sm:max-w-md max-h-[90vh] overflow-y-auto", className)}>
        {children}
      </DialogContent>
    );
  }

  return (
    <DrawerContent className={cn("glass-card border-t border-white/[0.08] max-h-[85dvh]", className)}>
      <div className="overflow-y-auto px-4 pb-safe pt-2" style={{ WebkitOverflowScrolling: "touch", paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        {children}
      </div>
    </DrawerContent>
  );
}

function ResponsiveModalHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) return <DialogHeader className={className}>{children}</DialogHeader>;
  return <DrawerHeader className={cn("text-left px-0", className)}>{children}</DrawerHeader>;
}

function ResponsiveModalTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) return <DialogTitle className={className}>{children}</DialogTitle>;
  return <DrawerTitle className={className}>{children}</DrawerTitle>;
}

function ResponsiveModalDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) return <DialogDescription className={className}>{children}</DialogDescription>;
  return <DrawerDescription className={className}>{children}</DrawerDescription>;
}

function ResponsiveModalTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) return <DialogTrigger asChild={asChild}>{children}</DialogTrigger>;
  return <DrawerTrigger asChild={asChild}>{children}</DrawerTrigger>;
}

function ResponsiveModalClose({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (isDesktop) return <DialogClose asChild={asChild}>{children}</DialogClose>;
  return <DrawerClose asChild={asChild}>{children}</DrawerClose>;
}

export {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalTrigger,
  ResponsiveModalClose,
};
