// src/pages/Edicion.jsx
import { useEffect, useState, useContext, useCallback } from "react";
import { useLocation } from "react-router-dom"; // Para leer location.state
import "../estilos/edicion.css"; // Estilos de la vista de edición
import { EdicionContext } from "../context/EdicionContext"; // Contexto para registrar handlers (cancelar/guardar)

export const Edicion2 = () => {
  const { register, unregister } = useContext(EdicionContext); // Registrar funciones para Layout
  const location = useLocation(); // Lee state pasado por Link
  const productoSeleccionado = location.state?.producto; // El producto enviado desde CardEdicion (si existe)
  const [extrasDisponibles, setExtrasDisponibles] = useState([]);
  const [productos, setProductos] = useState([]); // Productos a editar en esta vista (puede ser 1 o varios)
  const [originales, setOriginales] = useState([]); // Copia para poder cancelar cambios
  const [loading, setLoading] = useState(true); // Indicador de carga
  const excluirIds = [1]; // Ejemplo: ids de ingredientes a excluir
  const [total, setTotal] = useState(0);

  const idsExtrasProd1 = [9, 10, 13, 14, 15]; // IDs de ingredientes extra para el producto con id 1
  const idsExtrasProd2 = [10, 12, 13, 15]; // IDs de ingredientes extra para el producto con id 2
  const idsExtrasProd3 = [8, 9, 10, 11, 12, 13, 15]; // IDs de ingredientes extra para el producto con id 3

  // Función para obtener los IDs de ingredientes extra según el ID del producto

  // Effect principal: si viene producto por state carga solo ese, si no, carga todo el carrito
  useEffect(() => {
    // Si viene producto por navigation state
    if (productoSeleccionado?.id_producto ?? productoSeleccionado?.id) {
      const idProducto = productoSeleccionado.id_producto ?? productoSeleccionado.id;

      let idsExtras = [];
      if (idProducto === 1) idsExtras = idsExtrasProd1;
      else if (idProducto === 2) idsExtras = idsExtrasProd2;
      else if (idProducto === 3) idsExtras = idsExtrasProd3;

      const fetchExtras = async () => {
        try {
          const res = await fetch("http://localhost:3000/api/ingredientes");
          const data = await res.json();

          if (data?.status === "OK" && Array.isArray(data.data)) {
            // Filtrar solo los ingredientes que estén en idsExtras
            const extrasFiltrados = data.data.filter((ing) =>
              idsExtras.includes(ing.id_ingrediente)
            );
            setExtrasDisponibles(extrasFiltrados);
          }
        } catch (error) {
          console.error("Error al obtener ingredientes extras:", error);
        }
      };

      fetchExtras();
      // Si el producto ya trae ingredientes guardados, usarlos directamente
      if (Array.isArray(productoSeleccionado.ingredientes) && productoSeleccionado.ingredientes.length > 0) {
        const detalle = { ...productoSeleccionado };
        setProductos([detalle]);
        setOriginales([JSON.parse(JSON.stringify(detalle))]);
        setLoading(false);
        return; // ya cargado, no fetch necesario
      }

      // Si no trae ingredientes guardados, hacer fetch a la API (comportamiento previo)
      (async () => {
        try {
          const res = await fetch(`http://localhost:3000/api/productos/${idProducto}`);
          const data = await res.json();
          if (data?.status === "OK" && data.data?.ingredientes_base) {
            const filtrados = data.data.ingredientes_base
              .filter((ing) => !excluirIds.includes(ing.id_ingrediente))
              .map((ing) => ({ ...ing, cantidad: Number(ing.cantidad) || 0 }));
            const detalle = { ...productoSeleccionado, ingredientes: filtrados };
            setProductos([detalle]);
            setOriginales([JSON.parse(JSON.stringify(detalle))]);
          } else {
            setProductos([{ ...productoSeleccionado, ingredientes: [] }]);
            setOriginales([{ ...productoSeleccionado, ingredientes: [] }]);
          }
        } catch (err) {
          console.error("Error fetch producto seleccionado", idProducto, err);
          setProductos([{ ...productoSeleccionado, ingredientes: [] }]);
          setOriginales([{ ...productoSeleccionado, ingredientes: [] }]);
        } finally {
          setLoading(false);
        }
      })();

      return;
    }

    // Si no hay producto seleccionado: cargar carrito desde localStorage
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    if (carrito.length === 0) {
      setLoading(false);
      setProductos([]);
      return;
    }

    (async () => {
      try {
        const detalles = await Promise.all(
          carrito.map(async (prod) => {
            // Si la entrada del carrito ya trae ingredientes, úsalos y evita fetch
            if (Array.isArray(prod.ingredientes) && prod.ingredientes.length > 0) {
              return prod;
            }

            const idProducto = prod.id_producto ?? prod.id;
            if (!idProducto) return { ...prod, ingredientes: [] };

            try {
              const res = await fetch(`http://localhost:3000/api/productos/${idProducto}`);
              const data = await res.json();
              if (data?.status === "OK" && data.data?.ingredientes_base) {
                const filtrados = data.data.ingredientes_base
                  .filter((ing) => !excluirIds.includes(ing.id_ingrediente))
                  .map((ing) => ({ ...ing, cantidad: Number(ing.cantidad) || 0 }));
                return { ...prod, ingredientes: filtrados };
              } else {
                return { ...prod, ingredientes: [] };
              }
            } catch (err) {
              console.error("Error fetch producto", idProducto, err);
              return { ...prod, ingredientes: [] };
            }
          })
        );

        setProductos(detalles);
        setOriginales(JSON.parse(JSON.stringify(detalles)));
      } catch (err) {
        console.error("Error cargando detalles de carrito:", err);
      } finally {
        setLoading(false);
      }

    })();


    const idProducto = productoSeleccionado?.id_producto ?? productoSeleccionado?.id;
    if (!idProducto) return;

    // Seleccionar el array correspondiente
  }, [productoSeleccionado]); // Se vuelve a ejecutar si cambia el producto seleccionado

  // updateCantidad: modifica la cantidad de un ingrediente concreto
  // productoIndex: índice en el array productos; idIngrediente: id del ingrediente; delta: +1/-1
  const updateCantidad = (productoIndex, idIngrediente, delta) => {
    setProductos((prev) =>
      prev.map((prod, pIdx) => {
        if (pIdx !== productoIndex) return prod; // solo actualizar el producto correspondiente
        const newIngredientes = prod.ingredientes.map((ing) => {
          if (ing.id_ingrediente !== idIngrediente) return ing;
          const nueva = Math.max(0, Number(ing.cantidad) + delta); // no permitir negativas
          return { ...ing, cantidad: nueva };
        });
        return { ...prod, ingredientes: newIngredientes }; // devolver producto actualizado
      })
    );
  };

  // cancelarTodo: restaura el estado desde 'originales'
  const cancelarTodo = useCallback(() => {
    setProductos(JSON.parse(JSON.stringify(originales)));
  }, [originales]);

  // guardarTodo: actualiza el carrito en localStorage sin sobrescribir otros productos
  const guardarTodo = useCallback(() => {
    // lee carrito actual
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const actualizado = [...carrito]; // copia para mutar
    const usados = new Set(); // indices ya actualizados para evitar colisiones con duplicados

    // Para cada producto editado en esta vista, buscamos la primera coincidencia en el carrito
    productos.forEach((prodEdit) => {
      const idEdit = prodEdit.id_producto ?? prodEdit.id ?? null;
      if (idEdit == null) return;

      // Buscar primer elemento no usado del carrito que coincida por id
      const idx = actualizado.findIndex((item, i) => {
        if (usados.has(i)) return false; // ya usado
        const idItem = item.id_producto ?? item.id ?? null;
        return idItem === idEdit;
      });

      // Calcula subtotal a partir de ingredientes (si existen) o usando fallback
      // Calcula subtotal a partir de ingredientes (si existen) o usando fallback
      const subtotalCalc = (() => {
        const formatConComa = (num) => `$${num.toFixed(2).replace('.', ',')}`;

        if (Array.isArray(prodEdit.ingredientes) && prodEdit.ingredientes.length) {
          const s = prodEdit.ingredientes.reduce(
            (acc, ing) => acc + Number(ing.precio || 0) * Number(ing.cantidad || 0),
            0
          );
          return formatConComa(s + 0.5); // sumar cargo fijo (ejemplo 0.5)
        }
        if (prodEdit.subtotal) {
          const num = Number(String(prodEdit.subtotal).replace(/[^0-9.]/g, ""));
          return formatConComa(num);
        }
        if (prodEdit.precio) {
          const p = Number(String(prodEdit.precio).replace(/[^0-9.]/g, ""));
          const cant = Number(prodEdit.cantidad || 1);
          return formatConComa(p * cant);
        }
        return "$0,00";
      })();



      if (idx === -1) {
        // Si no se encontró coincidencia: añadir nueva entrada manteniendo formato
        const nuevo = {
          ...(prodEdit.id_producto ? { id_producto: prodEdit.id_producto } : { id: prodEdit.id }),
          nombre: prodEdit.nombre,
          descripcion: prodEdit.descripcion,
          cantidad: prodEdit.cantidad ?? 1,
          tamano: prodEdit.tamano ?? null,
          ingredientes: prodEdit.ingredientes ?? [],
          subtotal: subtotalCalc,
          precio: prodEdit.precio ?? `$${(subtotalCalc / (prodEdit.cantidad || 1)).toFixed(2)}`,
        };
        actualizado.push(nuevo);
        usados.add(actualizado.length - 1);
      } else {
        // Si existe: actualizar solo los campos relevantes y preservar el resto
        const itemViejo = actualizado[idx];
        const itemNuevo = {
          ...itemViejo, // conserva campos no mencionados
          ingredientes: prodEdit.ingredientes ?? itemViejo.ingredientes ?? [],
          cantidad: prodEdit.cantidad ?? itemViejo.cantidad ?? 1,
          tamano: prodEdit.tamano ?? itemViejo.tamano ?? null,
          subtotal: subtotalCalc,
          // mantener precio existente si estaba, si no calculamos uno por unidad
          precio:
            itemViejo.precio ??
            prodEdit.precio ??
            `$${(subtotalCalc / (prodEdit.cantidad || 1)).toFixed(2)}`,
        };
        actualizado[idx] = itemNuevo;
        usados.add(idx);
      }
    });

    // Persistir cambios y actualizar 'originales' local
    localStorage.setItem("carrito", JSON.stringify(actualizado));
    setOriginales(JSON.parse(JSON.stringify(actualizado)));
    return actualizado; // opcional: devolver actualizado para uso interno
  }, [productos, setOriginales]);


  // Registrar las funciones cancelar/guardar en el contexto para que Layout las llame
  useEffect(() => {
    register(cancelarTodo, guardarTodo);
    return () => unregister();
  }, [register, unregister, cancelarTodo, guardarTodo]);

  // Mensajes tempranos de retorno (evitan render innecesario)
  if (loading) return <p className="mensaje-vacio">Cargando...</p>;
  if (!productos.length) return <p className="mensaje-vacio">No hay productos seleccionados.</p>;



  // Render: para cada producto (normalmente 1 si venimos desde CardEdicion) mostramos su tabla de ingredientes
  return (
    <div className="edicion-contenedor">
      {productos.map((producto, idx) => {
        const claveProd = producto.id_producto ?? producto.id ?? idx; // key única segura
        return (
          <div key={claveProd} className="producto-edicion">
            <div className="tabla-wrapper">
              <table className="tabla-ingredientes">
                <thead>
                  <tr className="titulo-tabla">
                    <th colspan="4">Ingredientes del producto</th>
                  </tr>
                  <br />
                  <tr>
                    <th style={{ width: "140px" }}>Cantidad</th>
                    <th>Ingredientes</th>
                  </tr>
                </thead>
                <tbody>
                  {producto.ingredientes.map((ing) => (
                    <tr key={ing.id_ingrediente}>
                      <td>
                        <div className="botones-cantidad">
                          {/* Botones para restar / mostrar cantidad / sumar */}
                          <button onClick={() => updateCantidad(idx, ing.id_ingrediente, -1)}>−</button>
                          <span className="cantidades">{ing.cantidad}</span>
                          <button onClick={() => updateCantidad(idx, ing.id_ingrediente, +1)}>+</button>
                        </div>
                      </td>
                      <td>{ing.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="tabla-extras">
                <thead>
                  <tr className="titulo-tabla">
                    <th colSpan="3">Extras disponibles</th>
                  </tr>
                  <br />
                  <tr>
                    <th>Ingredientes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {extrasDisponibles.length > 0 ? (
                    extrasDisponibles.map((extra) => (
                      <tr key={extra.id_ingrediente}>
                        <td>{extra.nombre}</td>
                        {/* <td>${Number(extra.precio).toFixed(2)}</td> */}
                        <td>
                          <button
                            className="boton-agregar-extra"
                            onClick={() => {
                              setProductos((prev) =>
                                prev.map((prod, pIdx) => {
                                  if (pIdx !== idx) return prod;
                                  const yaExiste = prod.ingredientes.some(
                                    (ing) => ing.id_ingrediente === extra.id_ingrediente
                                  );
                                  if (yaExiste) return prod; // evitar duplicados
                                  return {
                                    ...prod,
                                    ingredientes: [
                                      ...prod.ingredientes,
                                      { ...extra, cantidad: 1 },
                                    ],
                                  };
                                })
                              );
                            }}
                          >
                            Agregar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", opacity: 0.6 }}>
                        No hay extras disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="footer-edicion">
              Total: $
              {(
                producto.ingredientes.reduce(
                  (acc, ing) => acc + Number(ing.precio) * Number(ing.cantidad),
                  0
                ) + 0.50
              ).toFixed(2).replace('.', ',')}

            </div>

          </div>
        );
      })}
    </div>
  );
};
