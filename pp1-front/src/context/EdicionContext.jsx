import { createContext, useRef, useCallback, useMemo } from "react";

export const EdicionContext = createContext({
  cancelar: () => {},
  guardar: () => {},
  register: () => {},
  unregister: () => {},
});

export const EdicionProvider = ({ children }) => {
  // guardamos handlers en un ref para no provocar re-renders al registrar
  const handlersRef = useRef({
    cancelar: () => {},
    guardar: () => {},
  });

  const register = useCallback(
    (cancelarFn, guardarFn) => {
      handlersRef.current = {
        cancelar: cancelarFn || (() => {}),
        guardar: guardarFn || (() => {}),
      };
    },
    []
  );

  const unregister = useCallback(() => {
    handlersRef.current = {
      cancelar: () => {},
      guardar: () => {},
    };
  }, []);

  // funciones estables que llaman a los handlers actuales
  const cancelar = useCallback(() => {
    try {
      handlersRef.current.cancelar();
    } catch (e) {
      /* noop */
    }
  }, []);

  const guardar = useCallback(() => {
    try {
      handlersRef.current.guardar();
    } catch (e) {
      /* noop */
    }
  }, []);

  const value = useMemo(
    () => ({ cancelar, guardar, register, unregister }),
    [cancelar, guardar, register, unregister]
  );

  return (
    <EdicionContext.Provider value={value}>{children}</EdicionContext.Provider>
  );
};