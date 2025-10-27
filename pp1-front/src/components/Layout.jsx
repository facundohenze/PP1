import { Link, useLocation } from "react-router-dom";
import { NavTab } from "./NavTab";
import { useEffect } from "react";
import "../estilos/layout.css";
import BarraSeleccion from "./BarraSeleccion";
import { useContext, useState } from "react";
import { EdicionContext } from "../context/EdicionContext";
import { useNavigate } from "react-router-dom";


export const Layout = ({ children }) => {
    const location = useLocation();
    const { cancelar, guardar } = useContext(EdicionContext);
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);

    const mostrar1 = location.pathname === "/Productos" || location.pathname === "/Extras" || location.pathname === "/Edicion" || 
        location.pathname === "/Carrito" || location.pathname === "/Edicion2" || location.pathname === "/Pago";
    const mostrar2 = location.pathname === "/Productos" || location.pathname === "/Extras";
    const mostrar3 = location.pathname === "/Productos" || location.pathname === "/Extras";
    const mostrar4 = location.pathname === "/Carrito";
    const mostrar5 = location.pathname === "/Edicion";
    const mostrar6 = location.pathname === "/Edicion2";

    useEffect(() => {
        const handleStorageChange = () => {
            setTotalEdicion(localStorage.getItem("precio") || 0);
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    return (
        <div className="layout">
            
            {/* {mostrar && ()} */}
            {mostrar1 && (
                <header className="layout-header">
                    <img src="public\imagenes\logo.png" alt="Logo" />
                </header>
            )}

            {mostrar2 && (
                <nav className="layout-tabs">
                    <NavTab />
                </nav>
            )}

            <main className="layout-main">
                <div className="productos-container">
                    {children}
                </div>
            </main>

            {mostrar3 && (
                <main className="layout-footer">
                    <BarraSeleccion />
                </main>
            )}

            {mostrar2 && (
                <div className="footer-buttons">
                    <div className="boton-cancelar-pedido">
                        <Link to="/Inicio">
                            <button>Cancelar Pedido</button>
                        </Link>
                    </div>
                    <Link to="/Edicion">
                        <button>Editar Selección</button>
                    </Link>
                    <div className="boton-aceptar-pedido">
                        <Link to="/Carrito">
                            <button>Agregar al Pedido</button>
                        </Link>
                    </div>
                </div>
            )}

            {mostrar5 && (
                <main className="layout-footer-carrito">
                    <div className="mensaje-seleccionar2">
                        <span>Selecciona un producto para editarlo</span>
                    </div>
                </main>
            )}

            {mostrar5 && (
                <div className="footer-buttons-carrito">
                    <div className="boton-cancelar-pedido">
                        <Link to="/Inicio">
                            <button>Cancelar Pedido</button>
                        </Link>
                    </div>
                    <Link to="/Productos">
                        <button>Menú</button>
                    </Link>
                    <div className="boton-aceptar-pedido">
                        <Link to="/Carrito">
                            <button>Agregar al Pedido</button>
                        </Link>
                    </div>

                </div>
            )}

            {mostrar6 && (
                <main className="layout-footer-carrito">
                </main>
            )}

            {mostrar6 && (
                <div className="footer-buttons-carrito">
                    <div className="boton-cancelar-pedido">
                        {/* llamar cancelar y luego navegar */
                        /* quitar Link para evitar navegar antes de ejecutar cancelar */}
                        <button
                            onClick={() => {
                                cancelar();
                                navigate("/Edicion");
                            }}
                            disabled={saving}
                        >
                            Cancelar Edicion
                        </button>
                    </div>

                    <div className="boton-aceptar-pedido">
                        {/* esperar a guardar antes de navegar; manejar estado de guardado */}
                        <button
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await guardar(); // funciona si guardar es sync o async
                                    navigate("/Edicion");
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                        >
                            {saving ? "Guardando..." : "Confirmar Edicion"}
                        </button>
                    </div>

                </div>
            )}

            {mostrar4 && (
                <main className="layout-footer-carrito">
                    {/* <h1>total</h1> */}
                </main>
            )}

            {mostrar4 && (
                <div className="footer-buttons-carrito">
                    <div className="boton-cancelar-pedido">
                        <Link to="/Inicio">
                            <button>Cancelar Pedido</button>
                        </Link>
                    </div>
                    <Link to="/Productos">
                        <button>Menú</button>
                    </Link>
                    <div className="boton-aceptar-pedido">
                        <Link to="/Pago">
                            <button>Confirmar Pedido</button>
                        </Link>
                    </div>
                </div>
            )}

        </div>
    );
};
