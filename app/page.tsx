import { LightLab } from "@/components/k1/LightLab"
import { Toaster } from "sonner"

export default function Page() {
  return (
    <>
      <LightLab />
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "glass shadow-elevation-2 border-border/50",
          },
        }}
      />
    </>
  )
}
