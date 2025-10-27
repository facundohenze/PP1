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

    const vaciarCarrito = () => {
        localStorage.removeItem("carrito");
        setItems([]);
    };

    // 🔹 Eliminar por índice, no por id
    const eliminarProducto = (index) => {
        const carritoActual = JSON.parse(localStorage.getItem("carrito")) || [];
        const nuevoCarrito = carritoActual.filter((_, i) => i !== index);
        localStorage.setItem("carrito", JSON.stringify(nuevoCarrito));
        setItems(nuevoCarrito);
    };

    // Calcular total general
    const total = items.reduce((acc, item) => {
        const precio =
            parseFloat(item.subtotal?.toString().replace("$", "")) ||
            parseFloat(item.precio?.toString().replace("$", "")) ||
            0;
        return acc + precio;
    }, 0);

    return (
        <>
            {/* <button onClick={vaciarCarrito} style={{ marginBottom: "15px" }}>
                Vaciar carrito
            </button> */}

            <table className="table">
                <thead>
                    <tr>
                        <th className="columna"></th>
                        <th className="columna">Producto</th>
                        <th className="columna">Descripción</th>
                        <th className="columna">Subtotal</th>
                        <th className="columna">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={5}>No hay productos en el carrito.</td>
                        </tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={idx}>
                                <td>
                                    <img
                                        src={`/imagenes/${item.id}.png`}
                                        alt={item.nombre}
                                        className="img-carrito"
                                    />
                                </td>
                                <td>{item.nombre}</td>
                                <td>{item.descripcion}</td>
                                <td>{item.subtotal || item.precio}</td>
                                <td>
                                    <button
                                        className="btn-eliminar"
                                        onClick={() => eliminarProducto(idx)} // 👈 eliminar por índice
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {items.length > 0 && (
                <div className="footer-edicion">
                    Total: ${total.toFixed(2)}
                </div>
            )}
        </>
    );
};
