import { Link } from "react-router-dom"
import { useIdioma } from "../components/IdiomaContex"
import "../estilos/inicio.css"
import "../estilos/idioma.css";


export const Inicio = () => {
  const { idioma, setIdioma, t } = useIdioma();  // usamos setIdioma consistentemente

  return (
    <div className="inicio">
      <header className="logo">
        <img src="public\imagenes\logo.png" alt="Logo" />
      </header>

      <div className="buttons">
        <Link to="/Productos">
          <button>
            <img src="/imagenes/llevar.png" alt="llevar" />
            <span className="texto-boton">{t("llevar")}</span>
          </button>
        </Link>

        <Link to="/Productos">
          <button>
            <img src="/imagenes/comer-aqui.png" alt="aqui" />
            <span className="texto-boton">{t("comer_aqui")}</span>
          </button>
        </Link>
      </div>
      <div className="selector-idioma">
        <h3>{t("selecciona_idioma")}</h3>
        <div className="idiomas-botones">
          <button
            onClick={() => setIdioma("es")}
            className={idioma === "es" ? "activo" : ""}
          >
            🇪🇸 Español
          </button>
          <button
            onClick={() => setIdioma("en")}
            className={idioma === "en" ? "activo" : ""}
          >
            🇬🇧 English
          </button>
          <button
            onClick={() => setIdioma("pt")}
            className={idioma === "pt" ? "activo" : ""}
          >
            🇧🇷 Português
          </button>
        </div>
      </div>
    </div>
  );
};
