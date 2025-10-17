import { NavLink } from "react-router-dom"
import '../estilos/navtab.css'

export const NavTab = () => {
    return (
        <ul className="nav nav-pills">
            <li className="nav-item">
                <NavLink to='/Productos' className="nav-link">Menú</NavLink>
            </li>
            <li className="nav-item">
                <NavLink to='/Extras' className="nav-link">Extras</NavLink>
            </li>
        </ul>
    )
}



