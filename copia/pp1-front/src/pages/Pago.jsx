import { useEffect, useState } from "react";
import "../estilos/pago.css";

export const Pago = () => {
  const [dni, setDni] = useState("");
  const [cliente, setCliente] = useState(null);
  const [cupones, setCupones] = useState([]);
  const [cuponSeleccionado, setCuponSeleccionado] = useState(null);
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // Cargar productos desde localStorage
  useEffect(() => {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    setItems(carrito);
    calcularTotal(carrito);
  }, []);

  const calcularTotal = (carrito, cupon = null) => {
    let subtotal = carrito.reduce((acc, item) => {
      const valor = parseFloat(item.subtotal || item.precio);
      return acc + (isNaN(valor) ? 0 : valor);
    }, 0);

    if (cupon) {
      subtotal = subtotal - subtotal * (cupon.descuento / 100);
    }

    setTotal(subtotal.toFixed(2));
  };

  // Buscar cliente por DNI
  // Buscar cliente por DNI
  const buscarCliente = async () => {
    if (!dni) {
      alert("Por favor ingrese un DNI válido");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/cupones/clientes/${dni}`);
      const data = await res.json();

      if (data.status === "OK" && data.data.length > 0) {
        setCliente({ nombre: data.data[0].nombre, dni });
        setCupones(data.data);
      } else {
        setCliente(null);
        setCupones([]);
        alert("Cliente no encontrado o sin cupones");
      }
    } catch (error) {
      console.error("Error al buscar cliente:", error);
    }
  };



  // Confirmar pago → guarda pedido en BD
  const confirmarPago = async () => {
    try {
      // Armamos el cuerpo del pedido con el formato que tu backend espera
      const productos = items.map((item) => ({
        id_producto: item.id_producto || item.id,
        ingredientes_personalizados: item.ingredientes_personalizados || []
      }));

      const pedidoBody = {
        productos,
        metodo_pago: metodoPago,
        id_cliente: cliente ? cliente.id_cliente : 5 // invitado
      };

      const response = await fetch("http://localhost:3000/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoBody),
      });

      const data = await response.json();

      if (data.status === "OK") {
        alert(`✅ Pedido #${data.data.id_pedido} creado correctamente.`);
        localStorage.removeItem("carrito");
        window.location.href = "/";
      } else {
        alert("❌ Error al crear el pedido: " + data.message);
      }

    } catch (error) {
      console.error("Error al confirmar el pedido:", error);
      alert("Ocurrió un error al procesar el pedido.");
    }
  };


  const cancelarPago = () => {
    if (confirm("¿Cancelar el pago y volver al carrito?")) {
      window.location.href = "/Carrito";
    }
  };

  return (
    <div className="pago-container">
      <h1 className="pago-titulo">💳 Pago del Pedido</h1>

      {/* 🧍 Datos del cliente */}
      <section className="pago-section">
        <h2>🧾 Datos del Cliente</h2>
        <div className="dni-busqueda">
          <input
            type="text"
            placeholder="Ingrese su DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <button className="btn-buscar" onClick={buscarCliente}>Buscar</button>
        </div>

        {cliente ? (
          <div className="cliente-info">
            <p><b>Nombre:</b> {cliente.nombre}</p>
            <p><b>DNI:</b> {cliente.dni}</p>
          </div>
        ) : (
          <p className="cliente-alerta">Cliente no encontrado — continuará como invitado.</p>
        )}
      </section>

      {/* 🎟️ Cupones */}
      {cupones.length > 0 && (
        <section className="pago-section">
          <h2>🎟️ Cupones disponibles</h2>
          <select
            className="select-cupon"
            onChange={(e) => {
              const cupon = cupones.find((c) => c.idcupon === parseInt(e.target.value));
              setCuponSeleccionado(cupon);
              calcularTotal(items, cupon);
            }}
          >
            <option value="">Seleccionar cupón</option>
            {cupones.map((cupon) => (
              <option key={cupon.idcupon} value={cupon.idcupon}>
                {cupon.codigo} — {cupon.descuento}% desc.
              </option>
            ))}
          </select>
        </section>
      )}

      {/* 🧾 Resumen del pedido */}
      <section className="pago-section resumen">
        <h2>🛍️ Resumen del pedido</h2>
        <table className="tabla-resumen">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Descripción</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.nombre}</td>
                <td>{item.descripcion}</td>
                <td>${item.subtotal || item.precio}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {cuponSeleccionado && (
          <p className="resumen-descuento">
            Descuento aplicado: <b>{cuponSeleccionado.descuento}%</b>
          </p>
        )}
        <h3 className="total-final">Total a pagar: ${total}</h3>
      </section>

      {/* 💳 Método de pago */}
      <section className="pago-section">
        <h2>💰 Método de pago</h2>
        <div className="metodos-pago">
          <label>
            <input
              type="radio"
              name="pago"
              value="efectivo"
              checked={metodoPago === "efectivo"}
              onChange={() => setMetodoPago("efectivo")}
            />
            Efectivo
          </label>
          <label>
            <input
              type="radio"
              name="pago"
              value="mercadopago"
              checked={metodoPago === "mercadopago"}
              onChange={() => setMetodoPago("mercadopago")}
            />
            Mercado Pago
          </label>
        </div>
      </section>

      {/* 🔘 Botones finales */}
      <div className="botones-pago">
        <button className="btn confirmar" onClick={confirmarPago}>✅ Confirmar Pago</button>
        <button className="btn cancelar" onClick={cancelarPago}>❌ Cancelar</button>
      </div>
    </div>
  );

};

export default Pago;
