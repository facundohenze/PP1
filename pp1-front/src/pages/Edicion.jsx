// src/pages/Edicion.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../estilos/edicion.css";
import { CardEdicion } from "../components/CardEdicion";
import { useLocation } from "react-router-dom";


// Página que muestra los items del carrito como tarjetas para editar
export const Edicion = () => {
  const [productos, setProductos] = useState([]); // items leídos desde localStorage o DB
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // cargarItems: preferir localStorage.carrito si existe; si no, traer desde la API y filtrar hamburguesas
  const cargarItems = async () => {
    setLoading(true);

    // 1) revisar localStorage primero (ediciones guardadas)
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    if (carrito.length > 0) {
      // si hay items en el carrito, mostrar exactamente eso (preserva ediciones)
      setProductos(carrito);
      setLoading(false);
      return;
    }
  };

  // recargar al montar y cuando cambie location (vuelvas desde Edicion2)
  useEffect(() => {
    cargarItems();
  }, [location]);

  // mensajes tempranos si está cargando o no hay productos
  if (loading) return <p className="mensaje-vacio">Cargando...</p>;
  if (!productos.length) return <p className="mensaje-vacio">No hay productos</p>;

  // Render: grid de tarjetas (CardEdicion) una por cada item del carrito
  return (
    <div className="grid-tarjetas">
      {productos.map((item, idx) => (
        <CardEdicion
          key={item.id_producto ?? item.id ?? idx}          // clave única para cada tarjeta
          id={item.id_producto ?? item.id}           // id que pasamos a CardEdicion
          cantidad={item.cantidad ?? 1}                   // cantidad en carrito
          imagen={`/imagenes/${item.id_producto ?? item.id}.png`} // ruta de imagen construida
          nombre={item.nombre}
          descripcion={item.descripcion}
          ingredientes={item.ingredientes} // pasar ingredientes si ya los tiene (viene de Edicion2)
        />
      ))}
    </div>
  );
};
