import { useEffect, useState } from "react"
import { Card } from "../components/Card"
import { CardEdicion } from "../components/CardEdicion";

export const Extras = () => {
  const [extras, setExtras] = useState([])
  const [tarjetaActiva, setTarjetaActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExtras = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/productos", { method: "GET" });
      const data = await response.json();
      if (data && data.data) {
        setExtras(data.data);
      } else {
        setError("No se recibieron productos.");
      }
    } catch (err) {
      console.error(err);
      setError("Error al cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtras()
  }, [])

   if (loading) return <p className="mensaje-vacio">Cargando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <>
      <div className="grid-tarjetas">
        {extras
          .filter(extra => extra.idcategoriaproducto === 2 || extra.idcategoriaproducto === 3)
          .map(extra => (
            <Card
              key={extra.id_producto}
              id={extra.id_producto}
              nombre={extra.nombre}
              descripcion={extra.descripcion}
              precio={`$${extra.precio_base}`}
              imagen={`/imagenes/${extra.id_producto}.png`}
              activa={tarjetaActiva === extra.id_producto}
              activar={setTarjetaActiva}
              categoria={extra.categoria}
            />
          ))
        }
      </div>
    </>
  )
}
