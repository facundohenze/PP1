import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Aplicacion } from "./Aplicacion";
import { EdicionProvider } from "./context/EdicionContext";
import { IdiomaProvider } from "./components/IdiomaContex";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <IdiomaProvider>
      <EdicionProvider>
        <BrowserRouter>
          <Aplicacion />
        </BrowserRouter>
      </EdicionProvider>
    </IdiomaProvider>
  </StrictMode>
);

