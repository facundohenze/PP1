import { createContext, useContext, useState, useEffect } from "react";
import { traducciones } from "./i18n";

export const IdiomaContext = createContext();

export const IdiomaProvider = ({ children }) => {
  const [idioma, setIdioma] = useState(() => localStorage.getItem("idioma") || "es");

  useEffect(() => {
    localStorage.setItem("idioma", idioma);
  }, [idioma]);

  // Exponer ambas funciones para mantener compatibilidad
  const cambiarIdioma = (nuevo) => setIdioma(nuevo);

  const t = (clave) => traducciones[idioma][clave] || clave;

  return (
    <IdiomaContext.Provider value={{ 
      idioma, 
      setIdioma,    // <-- exponemos ambas funciones
      cambiarIdioma,
      t 
    }}>
      {children}
    </IdiomaContext.Provider>
  );
};

export const useIdioma = () => useContext(IdiomaContext);
