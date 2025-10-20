import { useEffect, useState } from "react";
import "../estilos/barraSeleccion.css";

const BarraSeleccion = () => {
  const [items, setItems] = useState([]);

  const cargarCarrito = () => {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    setItems(carrito);
  };

  useEffect(() => {
    // Carga inicial
    cargarCarrito();

    // Escucha cambios en localStorage (por ejemplo, desde otra página o pestaña)
    const handleStorageChange = (event) => {
      if (event.key === "carrito") {
        cargarCarrito();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // También actualiza si el carrito cambia dentro de la misma pestaña
    const observer = new MutationObserver(() => cargarCarrito());
    observer.observe(document.body, { childList: true, subtree: true });

    // Limpieza
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="barra-seleccion">
      {items.length > 0 ? (
        items.map((item, index) => (
          <div key={index} className="item-seleccion">
            <img src={`/imagenes/${item.id}.png`} alt={item.nombre} />
            <span className="nombre">{item.nombre}</span>
            <span className="precio">{item.subtotal || item.precio}</span>
            <span className="precio">{item.tamano}</span>
          </div>
        ))
      ) : (
        
        <p className="vacio">Tu orden está vacía</p>
        
      )}
    </div>
  );
};

export default BarraSeleccion;
