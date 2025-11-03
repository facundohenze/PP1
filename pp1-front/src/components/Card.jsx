import { useState } from "react";
import { useIdioma } from "./IdiomaContex.jsx";
import "../estilos/cardEdicion.css";

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
  const { t } = useIdioma();

  // 🔹 Mantiene el valor numérico limpio
  const precioNumero = Number(precio.replace(/[^0-9.]/g, ""));
  const precioGrande = (precioNumero * 1.5).toFixed(2);

  // 🔹 Formateos solo para mostrar
  const mostrarPrecio = (valor) => `$${valor.toString().replace('.', ',')}`;

  const aumentar = () => setCantidad(cantidad + 1);
  const restar = () => {
    if (cantidad > 1) setCantidad(cantidad - 1);
  };

  const calcularTotal = () => {
    if (!tamano) return null;
    let base = tamano === "mediano" ? precioNumero : precioNumero * 1.5;
    return (base * cantidad).toFixed(2);
  };

  const puedeConfirmar = () => {
    if (categoria === "hamburguesa") {
      return true;
    }
    return tamano !== null;
  };

  const confirmar = async () => {
    if (!puedeConfirmar()) return;

    const precioUnitario = (() => {
      if (categoria === "hamburguesa") return precioNumero;
      return tamano === "grande" ? Number(precioGrande) : precioNumero;
    })();

    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    let opciones = [];

    if (categoria === "hamburguesa") {
      try {
        const res = await fetch(`http://localhost:3000/api/productos/${id}`);
        const data = await res.json();
        if (data?.data?.ingredientes_base) {
          opciones = data.data.ingredientes_base.map((ing) => ({
            ...ing,
            seleccionado: true,
          }));
        }
      } catch (err) {
        console.error("Error al cargar ingredientes:", err);
      }
    } else {
      opciones = [
        { nombre: "Mediano", precio: mostrarPrecio(precioNumero.toFixed(2)), seleccionado: tamano === "mediano" },
        { nombre: "Grande", precio: mostrarPrecio(precioGrande), seleccionado: tamano === "grande" },
      ];
    }

    for (let i = 0; i < cantidad; i++) {
      carrito.push({
        id,
        nombre,
        descripcion,
        categoria,
        cantidad: 1,
        tamano: categoria !== "hamburguesa" ? tamano : null,
        precio: mostrarPrecio(precioUnitario.toFixed(2)),
        opciones,
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
        <img
          src={imagen}
          alt={nombre}
          className={`tarjeta-imagen ${activa ? "img-activa" : "img-inactiva"}`}
        />
      </div>

      {/* -------- INACTIVA -------- */}
      {!activa && categoria !== "hamburguesa" && (
        <div className="tamano-precios">
          <span className="precio-mediano">
            {t("mediano")}: {mostrarPrecio(precioNumero.toFixed(2))}

          </span>
          <span className="precio-grande">
            {t("grande")}: {mostrarPrecio(precioGrande)}
          </span>
        </div>
      )}

      {!activa && categoria === "hamburguesa" && (
        <div className="precio-base">
          <span>{mostrarPrecio(precioNumero.toFixed(2))}</span>
        </div>
      )}

      {/* -------- ACTIVA -------- */}
      {activa && (
        <div className="tarjeta-controles">
          {categoria !== "hamburguesa" && (
            <div className="tamano-selector">
              <button
                className={tamano === "mediano" ? "activo" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setTamano("mediano");
                }}
              >
                {t("mediano")} {mostrarPrecio(precioNumero.toFixed(2))}
              </button>
              <button
                className={tamano === "grande" ? "activo" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  setTamano("grande");
                }}
              >
                {t("grande")} {mostrarPrecio(precioGrande)}
              </button>
            </div>
          )}

          {categoria !== "hamburguesa" && !tamano && (
            <div className="mensaje-seleccionar">
              <span>{t("seleccionaTamano")}</span>
            </div>
          )}

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

          {(categoria === "hamburguesa" || tamano) && (
            <div className="total-display rojo">
              Total: {mostrarPrecio(calcularTotal() || (precioNumero * cantidad).toFixed(2))}
            </div>
          )}

          <div className="action-buttons">
            <button
              className={`boton-confirmar ${!puedeConfirmar() ? "deshabilitado" : ""}`}
              disabled={!puedeConfirmar()}
              onClick={(e) => {
                e.stopPropagation();
                confirmar();
              }}
            >
              {t("confirmar")}
            </button>
            <button className="boton-cancelar" onClick={cancelar}>
              {t("cancelar")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
