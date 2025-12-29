"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: 'bg-secondary border-border-subtle text-white',
          title: 'text-white',
          description: 'text-gray-400',
          error: 'bg-red-500/20 border-red-500/50 text-red-400',
          success: 'bg-success-dark/20 border-success/50 text-success',
          warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
          info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
