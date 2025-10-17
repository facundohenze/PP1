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
    }
    return (
        <>
            <button onClick={vaciarCarrito} style={{ marginBottom: "15px" }}>
                Vaciar carrito
            </button>
            <table className="table">
                <thead>
                    <tr>
                        <th className="columna">Cantidad</th>
                        <th className="columna">Producto</th>
                        <th className="columna">Descripción</th>
                        <th className="columna">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={4}>No hay productos en el carrito.</td>
                        </tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.cantidad}</td>
                                <td>{item.nombre}</td>
                                <td>{item.descripcion}</td>
                                <td>
                                    ${(
                                        Number(
                                            (
                                                item.subtotal && Number(item.subtotal) > 0
                                                    ? item.subtotal
                                                    : item.precio
                                            ).toString().replace(/[^0-9.]/g, "")
                                        )
                                    ).toFixed(2)}
                                </td>

                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </>
    );
};
