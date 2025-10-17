import { LightLab } from "./components/k1/LightLab";
import { Toaster } from "sonner@2.0.3";

function App() {
  return (
    <>
      <LightLab />

      <Toaster 
        position="bottom-right" 
        toastOptions={{
          classNames: {
            toast: 'glass shadow-elevation-2 border-border/50',
          },
        }}
      />
    </>
  );
}

export default App;
