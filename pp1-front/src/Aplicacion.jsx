import { Route, Routes, Navigate } from "react-router-dom"
import { NavTab } from "./components/NavTab"
import { Productos } from "./pages/Productos"
import { Extras } from "./pages/Extras"
import { Carrito } from "./pages/Carrito"
import { Layout } from "./components/Layout"
import { Edicion } from "./pages/Edicion"
import { Edicion2 } from "./pages/Edicion2"
import { Inicio } from "./pages/Inicio"
import { Pago } from "./pages/Pago"

export const Aplicacion = () => {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<><Inicio /></>} />
                <Route path="/Inicio" element={<><Inicio /></>} />
                <Route path="/Productos" element={<><Productos /></>} />
                <Route path="/Extras" element={<><Extras /></>} />
                <Route path="/Carrito" element={<Carrito />} />
                <Route path="/Edicion" element={<Edicion />} />
                <Route path="/Edicion2" element={<Edicion2 />} />
                <Route path="/Pago" element={<Pago/>} />
                <Route path="/*" element={<Navigate to='/Productos' />} />
            </Routes>
        </Layout>
    )
}
