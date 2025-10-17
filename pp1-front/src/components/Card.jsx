import { useState } from "react";
import "../estilos/card.css";

export const Card = ({
  id,
  nombre,
  descripcion,
  precio,
  imagen,
  activa,
  activar,
  categoria, // 👈 pasamos desde Productos.jsx
}) => {
  const [cantidad, setCantidad] = useState(1);
  const [tamano, setTamano] = useState(null);

  const precioNumero = Number(precio.replace(/[^0-9.]/g, ""));
  const precioGrande = (precioNumero * 1.5).toFixed(2);

  const aumentar = () => setCantidad(cantidad + 1);
  const restar = () => {
    if (cantidad > 1) setCantidad(cantidad - 1);
  };

  const calcularTotal = () => {
    if (!tamano) return null;
    let base = tamano === "mediano" ? precioNumero : precioNumero * 1.5;
    return (base * cantidad).toFixed(2);
  };

  // Función para verificar si se puede confirmar
  const puedeConfirmar = () => {
    if (categoria === "hamburguesa") {
      return true; // Las hamburguesas no necesitan selección de tamaño
    }
    return tamano !== null; // Los extras requieren selección de tamaño
  };

  const confirmar = () => {
    // Verificación adicional antes de confirmar
    if (!puedeConfirmar()) return;

    // Precio unitario según tamaño/categoría
    const precioUnitario = (() => {
      if (categoria === "hamburguesa") return precioNumero;
      return tamano === "grande" ? Number(precioGrande) : precioNumero;
    })();

    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    // Crear N entradas separadas con cantidad = 1
    for (let i = 0; i < cantidad; i++) {
      carrito.push({
        id,
        nombre,
        descripcion,
        categoria,
        cantidad: 1,
        tamano: categoria !== "hamburguesa" ? tamano : null,
        precio: `$${precioUnitario.toFixed(2)}`, // guardar como string con $
      });
    }

    localStorage.setItem("carrito", JSON.stringify(carrito));

    setCantidad(1);
    setTamano(null);
    activar(null);
  };

  const cancelar = (e) => {
    e.stopPropagation();
    setCantidad(1);
    setTamano(null);
    activar(null);
  };

  return (
    <div
      className={`tarjeta ${activa ? "activa" : "inactiva"}`}
      onClick={() => !activa && activar(id)}
    >
      <div className="tarjeta-contenido">
        <h3>{nombre}</h3>
        <p>{descripcion}</p>
        <img src={imagen} alt={nombre} className={`tarjeta-imagen ${activa ? "img-activa" : "img-inactiva"}`} />
      </div>

      {/* -------- INACTIVA -------- */}
      {!activa && categoria !== "hamburguesa" && (
        <div className="tamano-precios">
          <span className="precio-mediano">Mediano: ${precioNumero}</span>
          <span className="precio-grande">Grande: ${precioGrande}</span>
        </div>
      )}

      {!activa && categoria === "hamburguesa" && (
        <div className="precio-base">
          <span>${precioNumero}</span>
        </div>
      )}

      {/* -------- ACTIVA -------- */}
      {activa && (
        <div className="tarjeta-controles">
          {/* Selector de tamaño solo en extras */}
          {categoria !== "hamburguesa" && (
            <div className="tamano-selector">
              <button
                className={tamano === "mediano" ? "activo" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setTamano("mediano");
                }}
              >
                Mediano (${precioNumero})
              </button>
              <button
                className={tamano === "grande" ? "activo" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setTamano("grande");
                }}
              >
                Grande (${precioGrande})
              </button>
            </div>
          )}

          {/* Mensaje de ayuda cuando no se ha seleccionado tamaño */}
          {categoria !== "hamburguesa" && !tamano && (
            <div className="mensaje-seleccionar">
              <span>Selecciona un tamaño primero</span>
            </div>
          )}

          {/* Controles de cantidad */}
          <div className="cantidad-controls">
            <button
              onClick={(e) => {
                e.stopPropagation();
                restar();
              }}
            >
              -
            </button>
            <span className="cantidad-display">{cantidad}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                aumentar();
              }}
            >
              +
            </button>
          </div>

          {/* Total */}
          {((categoria !== "hamburguesa" && tamano) ||
            categoria === "hamburguesa") && (
              <div className="total-display rojo">
                Total: ${calcularTotal() || (precioNumero * cantidad).toFixed(2)}
              </div>
            )}

          {/* Confirmar / Cancelar */}
          <div className="action-buttons">
            <button
              className={`boton-confirmar ${!puedeConfirmar() ? 'deshabilitado' : ''}`}
              disabled={!puedeConfirmar()}
              onClick={(e) => {
                e.stopPropagation();
                confirmar();
              }}
            >
              Confirmar
            </button>
            <button className="boton-cancelar" onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};