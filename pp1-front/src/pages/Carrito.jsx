import { useEffect, useState } from "react";
import "../estilos/carrito.css";

export const Carrito = () => {
  const [items, setItems] = useState([]);

  const cargarItems = () => {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    setItems(carrito);
  };

  useEffect(() => {
    cargarItems();
  }, []);

  const eliminarProducto = (index) => {
    const carritoActual = JSON.parse(localStorage.getItem("carrito")) || [];
    const nuevoCarrito = carritoActual.filter((_, i) => i !== index);
    localStorage.setItem("carrito", JSON.stringify(nuevoCarrito));
    setItems(nuevoCarrito);
  };

  const total = items.reduce((acc, item) => {
    const precio =
      parseFloat(item.subtotal?.toString().replace("$", "")) ||
      parseFloat(item.precio?.toString().replace("$", "")) ||
      0;
    return acc + precio;
  }, 0);

  return (
    <div className="carrito-container">
      {items.length === 0 ? (
        <p className="vacio">No hay productos en el carrito.</p>
      ) : (
        <div className="carrito-grid">
          {items.map((item, idx) => (
            <div key={idx} className="carrito-card">
              <img
                src={`/imagenes/${item.id}.png`}
                alt={item.nombre}
                className="carrito-imagen"
              />

              <div className="carrito-info">
                <h3 className="carrito-nombre">{item.nombre}</h3>
                <p className="carrito-descripcion">{item.descripcion}</p>
                <p className="carrito-tamaño">{item.tamano}</p>
                <p className="carrito-precio">{item.subtotal || item.precio}</p>

              </div>

              <button
                className="btn-eliminar"
                onClick={() => eliminarProducto(idx)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="footer-total">Total: ${total.toFixed(2)}</div>
      )}
    </div>
  );
};
