import { Link } from "react-router-dom"
import "../estilos/inicio.css"


export const Inicio = () => {


  return (

    <div className="inicio">
      <header className="logo">
        <img src="public\imagenes\logo.png" alt="Logo" />
      </header>

      <div className="buttons">
        <Link to="/Productos">
          <button>
            <img src="/imagenes/llevar.png" alt="llevar" />
            <span className="texto-boton">Llevar</span>
          </button>
        </Link>

        <Link to="/Productos">
          <button>
            <img src="/imagenes/comer-aqui.png" alt="aqui" />
            <span className="texto-boton">Comer Aquí</span>
          </button>
        </Link>
      </div>
      

    </div>


  )
}
