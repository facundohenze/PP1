import { Link } from "react-router-dom"; // Importa Link para navegar y pasar state
import "../estilos/cardEdicion.css"; // Importa estilos específicos para la card de edición

// Componente visual que representa una tarjeta en la vista "Edicion"
export const CardEdicion = ({
  id, // id del producto (id_producto o id)
  cantidad, // cantidad almacenada en el carrito para este ítem
  imagen, // ruta de la imagen
  nombre, // nombre del producto
  descripcion, // descripción del producto
  ingredientes
}) => {
  return (
    <div className="tarjeta inactiva">
      {/* Contenido principal de la tarjeta */}
      <div className="tarjeta-contenido">
        <h3 className="tarjeta-titulo">{nombre}</h3> {/* Título del producto */}
        <p className="tarjeta-descripcion">{descripcion}</p> {/* Descripción */}
        <img src={imagen} alt={nombre} className="tarjeta-imagen img-inactiva" /> {/* Imagen */}
        <div className="cantidad-controls">
          <span className="cantidad-display">Cantidad: {cantidad}</span> {/* Muestra cantidad */}
        </div>
      </div>

      {/* Link hacia Edicion2, pasando el producto en location.state */}
      <Link
        to="/Edicion2"
        // Pasar el producto seleccionado a Edicion2 para que cargue solo sus ingredientes
        state={{
          producto: {
            id_producto: id, // conservamos el id como id_producto
            cantidad, // cantidad tal como estaba en el carrito
            imagen,
            nombre,
            descripcion,
            ingredientes: ingredientes || [] // placeholder; Edicion2 hará fetch y lo llenará
          }
        }}
      >
        <button className="boton-editar">
          Editar
        </button>
      </Link>
    </div>
  );
};