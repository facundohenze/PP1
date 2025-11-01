import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../estilos/cardEdicion.css";

// ...existing code...
export const CardEdicion = ({
  id, // id del producto (id_producto o id)
  cantidad = 1, // cantidad almacenada en el carrito para este ítem
  imagen, // ruta de la imagen
  nombre, // nombre del producto
  descripcion, // descripción del producto
  ingredientes = [], // ingredientes si existen
  categoria = "producto", // categoría, ej. "hamburguesa" o "extra"
  precio, // opcional: usado si queremos guardar precio en localStorage
  onConfirm, // callback opcional
}) => {
  // ids que consideramos "extras" (según tu pedido)
  const extrasIds = new Set([4, 5, 6, 7, 8, 9, 10]);

  // estado UI
  const [activa, setActiva] = useState(false); // mostrar controles dentro de la card
  const [tamano, setTamano] = useState(null);
  const [cantidadLocal, setCantidadLocal] = useState(cantidad);

  // detectar si este item es tratado como extra
  const esExtra = categoria === "extra" || extrasIds.has(Number(id));

  // al montar, consultar localStorage para prellenar tamaño/cantidad si existe
  useEffect(() => {
    try {
      const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
      // buscar la primera instancia que coincida por id (id_producto o id)
      const matchIndex = carrito.findIndex(
        (it) => (it.id_producto ?? it.id ?? null) === (id ?? null)
      );
      if (matchIndex !== -1) {
        const item = carrito[matchIndex];
        if (item.tamano) setTamano(item.tamano);
        if (typeof item.cantidad !== "undefined") setCantidadLocal(Number(item.cantidad) || 1);
      } else {
        // si no hay match, dejamos los valores por defecto
        setTamano(null);
        setCantidadLocal(cantidad ?? 1);
      }
    } catch (e) {
      // si falla parseo, mantener valores por defecto
      setTamano(null);
      setCantidadLocal(cantidad ?? 1);
    }
  }, [id, cantidad]);

  // abrir/cerrar controles
  const abrirControles = (e) => {
    e?.stopPropagation();
    setActiva(true);
  };
  const cerrarControles = (e) => {
    e?.stopPropagation();

    // volver a cargar el tamaño y cantidad originales desde el localStorage
    try {
      const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
      const item = carrito.find(
        (it) => (it.id_producto ?? it.id ?? null) === (id ?? null)
      );
      if (item) {
        setTamano(item.tamano || null);
        setCantidadLocal(Number(item.cantidad) || 1);
      } else {
        // si no está en el carrito, dejamos los valores iniciales
        setTamano(null);
        setCantidadLocal(cantidad ?? 1);
      }
    } catch (err) {
      console.error("Error al resetear en cancelar:", err);
    }

    setActiva(false); // cerrar controles
  };

  // confirmar: guardar cambios en localStorage (actualizar instancia encontrada o añadir)
  const confirmarLocal = (e) => {
    e?.stopPropagation();

    try {
      const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

      // buscar primer item coincidente por id
      const idx = carrito.findIndex(
        (it) => (it.id_producto ?? it.id ?? null) === (id ?? null)
      );

      if (idx === -1) {
        // no existe: añadir nueva entrada (mantener formato parecido al resto)
        const nuevo = {
          ...(id ? { id_producto: id } : {}),
          nombre,
          descripcion,
          cantidad: cantidadLocal,
          tamano: esExtra ? tamano : null,
          categoria: categoria,
          precio: precio ?? carrito[0]?.precio ?? undefined,
          ingredientes: ingredientes ?? [],
        };
        carrito.push(nuevo);
      } else {
        // existe: actualizar campos relevantes sin sobrescribir otros
        const viejo = carrito[idx];
        carrito[idx] = {
          ...viejo,
          cantidad: cantidadLocal,
          tamano: esExtra ? tamano : viejo.tamano ?? null,
          ingredientes: ingredientes ?? viejo.ingredientes ?? [],
        };
      }

      localStorage.setItem("carrito", JSON.stringify(carrito));
      setActiva(false);

      // notificar al padre si lo requiere
      if (typeof onConfirm === "function") onConfirm({ id, cantidad: cantidadLocal, tamano });

    } catch (err) {
      console.error("Error al confirmar CardEdicion:", err);
    }
  };

  // controles de cantidad/tamaño (mismo formato visual que Card.jsx)
  const aumentar = (e) => {
    e?.stopPropagation();
    setCantidadLocal((c) => c + 1);
  };
  const restar = (e) => {
    e?.stopPropagation();
    setCantidadLocal((c) => Math.max(1, c - 1));
  };

  // Render: si es extra mostramos controles dentro de la card, sino mantenemos Link a Edicion2
  if (esExtra) {
    // Buscar el objeto en localStorage
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const productoGuardado = carrito.find((p) => p.id === id);

    // Precio base actual (según tamaño)
    const precioActual = productoGuardado?.opciones?.find(
      (opt) => opt.nombre.toLowerCase() === tamano?.toLowerCase()
    )?.precio || productoGuardado?.precio || 0;

    const cambiarTamano = (nuevoTamano) => {
      setTamano(nuevoTamano);

      // Encontrar el nuevo precio (numérico)
      const nuevoPrecio = parseFloat(
        productoGuardado?.opciones?.find(
          (opt) => opt.nombre.toLowerCase() === nuevoTamano.toLowerCase()
        )?.precio || 0
      );

      // Formatear el precio con signo $
      const precioFormateado = `$${nuevoPrecio.toFixed(2)}`;

      // Actualizar localStorage
      const nuevoCarrito = carrito.map((item) =>
        item.id === id
          ? { ...item, tamano: nuevoTamano, precio: precioFormateado }
          : item
      );

      localStorage.setItem("carrito", JSON.stringify(nuevoCarrito));
    };


    return (
      <div className={`tarjeta ${activa ? "activa" : "inactiva"}`}>
        <div className="tarjeta-contenido">
          <h3 className="tarjeta-titulo">{nombre}</h3>
          <p className="tarjeta-descripcion">{descripcion}</p>
          <img src={imagen} alt={nombre} className="tarjeta-imagen img-inactiva" />
        </div>
          <div className="tarjeta-controles">
            {/* Tamaños */}
            <div className="tamano-selector">
              <button
                className={tamano === "mediano" ? "activo" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  cambiarTamano("mediano");
                }}
              >
                Mediano (${productoGuardado?.opciones?.find(o => o.nombre === "Mediano")?.precio || 0})
              </button>
              <button
                className={tamano === "grande" ? "activo" : ""}
                onClick={(e) => {
                  e.stopPropagation();
                  cambiarTamano("grande");
                }}
              >
                Grande (${productoGuardado?.opciones?.find(o => o.nombre === "Grande")?.precio || 0})
              </button>
            </div>

            {/* <p className="precio-actual">
              Precio actual: <b>${precioActual}</b>
            </p> */}
          </div>
        
      </div>
    );
  }


  return (
    <div className="tarjeta inactiva">
      {/* Contenido principal de la tarjeta */}
      <div className="tarjeta-contenido">
        <h3 className="tarjeta-titulo">{nombre}</h3> {/* Título del producto */}
        <p className="tarjeta-descripcion">{descripcion}</p> {/* Descripción */}
        <img src={imagen} alt={nombre} className="tarjeta-imagen img-inactiva" /> {/* Imagen */}
      </div>

      {/* Link hacia Edicion2, pasando el producto en location.state */}
      <Link
        to="/Edicion2"
        // Pasar el producto seleccionado a Edicion2 para que cargue solo sus ingredientes
        state={{
          producto: {
            id_producto: id, // conservamos el id como id_producto
            cantidad, // cantidad tal como estaba en el carrito
            imagen,
            nombre,
            descripcion,
            ingredientes: ingredientes || [] // placeholder; Edicion2 hará fetch y lo llenará
          }
        }}
      >
        <button className="boton-editar">
          Personalizar
        </button>
      </Link>
    </div>
  );
};