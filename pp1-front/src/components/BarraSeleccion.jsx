import { useEffect, useState } from "react";
import "../estilos/barraSeleccion.css"

const BarraSeleccion = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    setItems(carrito);
  }, []);

  // Si querés que se actualice automáticamente cuando se agregan productos,
  // podés usar un event listener en localStorage, pero para empezar con F5 basta.

  return (
    <div className="barra-seleccion">
      {items.map((item, index) => (
        <div key={index} className="item-seleccion">
          <img src={`/imagenes/${item.id}.png`} alt={item.nombre} />
          <span className="cantidad">{item.cantidad}x</span>
          <span className="nombre">{item.nombre}</span>
          <span className="precio">{item.precio}</span>
          <span className="precio">{item.tamano}</span>
        </div>
      ))}
    </div>
  );
};

export default BarraSeleccion;
