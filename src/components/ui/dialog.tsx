"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

/* ─── Context to share open state with overlay/content ─── */

const DialogContext = React.createContext<{ open: boolean }>({ open: false })

/* ─── Dialog Root ─── */

function Dialog({
  open = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  const prevOpenRef = React.useRef(open);
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    (window as any).__radixDialogOpen = open;
  }

  return (
    <DialogContext.Provider value={{ open }}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

/* ─── Overlay ─── */

const springOverlay = { type: "spring" as const, damping: 30, stiffness: 300 }

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  const { open } = React.useContext(DialogContext)

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Overlay forceMount asChild key="dialog-overlay" {...props}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springOverlay}
            onPointerDownCapture={(e: React.PointerEvent) => e.stopPropagation()}
            className={cn("fixed inset-0 z-50 bg-black/80", className)}
          />
        </DialogPrimitive.Overlay>
      )}
    </AnimatePresence>
  )
}
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/* ─── Content ─── */

const springContent = {
  type: "spring" as const,
  damping: 28,
  stiffness: 320,
  mass: 0.8,
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const { open } = React.useContext(DialogContext)

  const handlePointerDownOutside = (event: any) => {
    event.preventDefault()
    event.stopPropagation()
    onPointerDownOutside?.(event)
  }

  const handleInteractOutside = (event: any) => {
    event.preventDefault()
    event.stopPropagation()
    onInteractOutside?.(event)
  }

  return (
    <DialogPrimitive.Portal forceMount>
      <DialogOverlay />
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Content
            forceMount
            asChild
            key="dialog-content"
            onPointerDownOutside={handlePointerDownOutside}
            onInteractOutside={handleInteractOutside}
            {...props}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={springContent}
              data-radix-dialog-content
              className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
                className,
              )}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </motion.div>
          </DialogPrimitive.Content>
        )}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  )
}
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
