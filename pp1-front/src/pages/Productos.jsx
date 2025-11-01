import { useEffect, useState } from "react"
import { Card } from "../components/Card"

export const Productos = () => {
    const [productos, setProductos] = useState([]);
    const [tarjetaActiva, setTarjetaActiva] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProductos = async () => {
        try {
            const response = await fetch("http://localhost:3000/api/productos", { method: "GET" });
            const data = await response.json();
            console.log("🔍 Datos completos del fetch:", data);
            if (data && data.data) {
                setProductos(data.data);
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
        fetchProductos();
    }, []);

    if (loading) return <p className="mensaje-vacio">Cargando...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div className="grid-tarjetas">
            {productos
                .filter(producto => producto.idcategoriaproducto === 1)
                .map(producto => (
                    <Card 
                        key={producto.id_producto}
                        id={producto.id_producto}
                        nombre={producto.nombre}
                        descripcion={producto.descripcion}
                        precio={`$${producto.precio_base}`}
                        imagen={`/imagenes/${producto.id_producto}.png`}
                        activa={tarjetaActiva === producto.id_producto}
                        activar={setTarjetaActiva}
                        categoria={producto.categoria}
                        
                    />
                ))}
        </div>
    );
};