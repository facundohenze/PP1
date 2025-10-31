import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Aplicacion } from "./Aplicacion";
import { EdicionProvider } from "./context/EdicionContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <EdicionProvider>
      <BrowserRouter>
        <Aplicacion />
      </BrowserRouter>
    </EdicionProvider>
  </StrictMode>
);

