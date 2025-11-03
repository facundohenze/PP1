import { useEffect, useState } from "react";
import "../estilos/carrito.css";
import { useIdioma } from "../components/IdiomaContex.jsx";

export const Carrito = () => {
    const [items, setItems] = useState([]);
    const { t } = useIdioma();
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
        // 👇 Si ya no quedan productos, redirige
        if (nuevoCarrito.length === 0) {
            window.location.href = "/Productos";
        }
    };

    // 🔹 Calcular total corrigiendo formato decimal (coma o punto)
    const total = items.reduce((acc, item) => {
        // Reemplaza coma por punto antes de convertir a número
        const precioStr =
            item.subtotal?.toString().replace("$", "").replace(",", ".") ||
            item.precio?.toString().replace("$", "").replace(",", ".") ||
            "0";

        const precioNum = parseFloat(precioStr) || 0;
        return acc + precioNum;
    }, 0);

    // 🔹 Mostrar total con coma
    const totalFormateado = total.toFixed(2).replace(".", ",");

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
                                {t("eliminar")}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {items.length > 0 && (
                <div className="footer-total">Total: ${totalFormateado}</div>
            )}
        </div>
    );
};

