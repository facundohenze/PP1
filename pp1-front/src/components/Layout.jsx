import { Link, useLocation } from "react-router-dom";
import { NavTab } from "./NavTab";
import { useEffect } from "react";
import "../estilos/layout.css";
import BarraSeleccion from "./BarraSeleccion";
import { useContext, useState } from "react";
import { EdicionContext } from "../context/EdicionContext";
import { useNavigate } from "react-router-dom";
import { useIdioma } from "./IdiomaContex.jsx";


export const Layout = ({ children }) => {
    const { t } = useIdioma();
    const location = useLocation();
    const pathname = location.pathname || "/";
    const { cancelar, guardar } = useContext(EdicionContext);
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [totalEdicion, setTotalEdicion] = useState(0); // añadido para evitar referencia indefinida
    const [mensajeError, setMensajeError] = useState("");
    const volverInicio = () => {
        localStorage.removeItem("carrito");
        navigate("/");
    };
    // ahora usamos matching robusto:
    const mostrar1 = ["/Productos", "/Extras", "/Edicion", "/Carrito", "/Edicion2", "/Pago"].includes(pathname)
        || pathname.startsWith("/PagoExitoso");
    const mostrar2 = ["/Productos", "/Extras"].includes(pathname);
    const mostrar3 = ["/Productos", "/Extras"].includes(pathname);
    const mostrar4 = pathname === "/Carrito";
    const mostrar5 = pathname === "/Edicion";
    const mostrar6 = pathname === "/Edicion2";
    const mostrar7 = pathname === "/Pago";
    const mostrar8 = pathname.startsWith("/PagoExitoso"); // true para /PagoExitoso/:id_pedido

    useEffect(() => {
        const handleStorageChange = () => {
            setTotalEdicion(Number(localStorage.getItem("precio")) || 0);
        };
        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    return (
        <div className="layout">

            {mostrar1 && (
                <header className="layout-header">
                    <img src="/imagenes/logo.png" alt="Logo" />
                    <div className="circulos">
                        <img src="/imagenes/Captura.PNG" alt="circulos" />
                    </div>
                </header>
            )}

            {mostrar2 && (
                <nav className="layout-tabs">
                    <NavTab />
                </nav>
            )}

            <main className="layout-main">
                {mostrar4 && (
                    <main className="layout-top">
                        <h1>{t("tu_pedido")}</h1>
                    </main>
                )}

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
                            <button onClick={volverInicio}>{t("cancelar_pedido")}</button>
                        </Link>
                    </div>
                    <button
                        onClick={() => {
                            const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
                            if (carrito.length === 0) {
                                return; // no hace nada
                            }
                            // ✅ Si hay productos, redirige al carrito
                            window.location.href = "/Edicion";
                        }}
                    >
                        {t("editar_seleccion")}
                    </button>
                    <div className="boton-aceptar-pedido">
                        <button
                            onClick={() => {
                                const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
                                if (carrito.length === 0) {
                                    return; // no hace nada
                                }
                                // ✅ Si hay productos, redirige al carrito
                                window.location.href = "/Carrito";
                            }}
                        >
                            {t("agregar_pedido")}
                        </button>
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
                            <button onClick={volverInicio}>{t("cancelar_pedido")}</button>
                        </Link>
                    </div>
                    <Link to="/Productos">
                        <button>Menú</button>
                    </Link>
                    <div className="boton-aceptar-pedido">
                        <Link to="/Carrito">
                            <button>{t("agregar_pedido")}</button>
                        </Link>
                    </div>

                </div>
            )}

            {mostrar7 && (
                <div className="footer-buttons-carrito">
                </div>
            )}

            {mostrar8 && (
                <div className="footer-buttons-carrito">
                </div>
            )}

            {mostrar6 && (
                <main className="layout-footer-carrito">
                </main>
            )}

            {mostrar6 && (
                <div className="footer-buttons-carrito">
                    <div className="boton-cancelar-pedido">
                        <button
                            onClick={() => {
                                cancelar();
                                navigate("/Edicion");
                            }}
                            disabled={saving}
                        >
                            {t("cancelar_edicion")}
                        </button>
                    </div>

                    <div className="boton-aceptar-pedido">
                        <button
                            onClick={async () => {
                                setSaving(true);
                                try {
                                    await guardar();
                                    navigate("/Edicion");
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                        >
                            {saving ? t("guardando") : t("confirmar_edicion")}
                        </button>
                    </div>

                </div>
            )}

            {mostrar4 && (
                <main className="layout-footer-carrito">
                </main>
            )}

            {mostrar4 && (
                <div className="footer-buttons-carrito">
                    <div className="boton-cancelar-pedido">
                        <Link to="/Inicio">
                            <button onClick={volverInicio}>{t("cancelar_pedido")}</button>
                        </Link>
                    </div>
                    <Link to="/Productos">
                        <button>Menú</button>
                    </Link>
                    <div className="boton-aceptar-pedido">
                        <Link to="/Pago">
                            <button>{t("confirmar_pedido")}</button>
                        </Link>
                    </div>
                </div>
            )}

        </div>
    );
};
