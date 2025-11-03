import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../estilos/pagoExitoso.css";

export const PagoExitoso = () => {
  const { id_pedido } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [mostrarTicket, setMostrarTicket] = useState(false);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/pedidos/${id_pedido}`);
        const data = await res.json();
        if (data.status === "OK") {
          // Mostrar animación y luego ticket
          setTimeout(() => {
            setPedido(data.data);
            setMostrarTicket(true);
          }, 2500); // 2.5s animación antes del ticket
        }
      } catch (error) {
        console.error("Error al obtener pedido:", error);
      }
    };
    fetchPedido();
  }, [id_pedido]);

  const volverInicio = () => {
    localStorage.removeItem("carrito");
    navigate("/");
  };

  return (
    <div className="pago-exitoso-container">
      {!mostrarTicket ? (
        <div className="animacion-pago">
          <div className="checkmark">✔</div>
          <h2>Pago realizado con éxito</h2>
          <p>Procesando tu pedido...</p>
        </div>
      ) : (
        <div className="ticket-container">
          <h2>Ticket #{pedido.id_pedido}</h2>
          <p><strong>Fecha:</strong> {new Date(pedido.fecha_hora).toLocaleString()}</p>
          <p><strong>Cliente:</strong> {pedido.id_cliente}</p>
          <p><strong>Total:</strong> ${pedido.total}</p>
          <p><strong>Estado:</strong> {pedido.estado || "Pendiente"}</p>

          <button className="btn-volver" onClick={volverInicio}>
            Finalizar
          </button>
        </div>
      )}
    </div>
  );
};
