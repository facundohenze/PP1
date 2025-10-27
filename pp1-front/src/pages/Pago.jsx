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
  const buscarCliente = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/clientes?dni=${dni}`);
      const data = await res.json();

      if (data.status === "OK" && data.data.length > 0) {
        setCliente(data.data[0]);
        obtenerCupones(data.data[0].id_cliente);
      } else {
        setCliente(null);
        setCupones([]);
        alert("Cliente no encontrado. Continuará como invitado.");
      }
    } catch (error) {
      console.error("Error al buscar cliente:", error);
    }
  };

  // Obtener cupones del cliente
  const obtenerCupones = async (idCliente) => {
    try {
      const res = await fetch(`http://localhost:3000/api/cupones/${idCliente}`);
      const data = await res.json();

      if (data.status === "OK") {
        setCupones(data.data);
      }
    } catch (error) {
      console.error("Error al obtener cupones:", error);
    }
  };

  // Confirmar pago → guarda pedido en BD
  const confirmarPago = async () => {
    try {
      // 1️⃣ Crear pedido
      const pedidoRes = await fetch("http://localhost:3000/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_cliente: cliente ? cliente.id_cliente : null,
          total,
          metodo_pago: metodoPago,
          id_estado: 1,
        }),
      });
      const pedidoData = await pedidoRes.json();
      const idPedido = pedidoData.data?.id_pedido;

      if (!idPedido) throw new Error("No se pudo crear el pedido");

      // 2️⃣ Agregar productos
      for (const item of items) {
        const productoRes = await fetch(
          `http://localhost:3000/api/pedidos/${idPedido}/productos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_producto: item.id,
              cantidad: item.cantidad || 1,
              subtotal: item.subtotal || item.precio,
            }),
          }
        );
        await productoRes.json();
      }

      // 3️⃣ Registrar pago
      await fetch(`http://localhost:3000/api/pago`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idpedido: idPedido,
          idtipopago: metodoPago === "efectivo" ? 1 : 2,
          monto: total,
          descripcion: cuponSeleccionado
            ? `Pago con cupón: ${cuponSeleccionado.codigo}`
            : "Pago sin cupón",
        }),
      });

      alert("✅ Pedido registrado con éxito.");
      localStorage.removeItem("carrito");
      window.location.href = "/"; // Redirigir a inicio o confirmar pedido

    } catch (error) {
      console.error("Error al confirmar pago:", error);
      alert("❌ Hubo un error al procesar el pago.");
    }
  };

  const cancelarPago = () => {
    if (confirm("¿Cancelar el pago y volver al carrito?")) {
      window.location.href = "/Carrito";
    }
  };

  return (
    <div className="pago-container">
      <h1>Pago del Pedido</h1>

      {/* 🧍 Datos del cliente */}
      <div className="pago-section">
        <h2>Datos del Cliente</h2>
        <div className="dni-busqueda">
          <input
            type="text"
            placeholder="Ingrese su DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <button onClick={buscarCliente}>Buscar</button>
        </div>
        {cliente && (
          <p>
            Cliente encontrado: <b>{cliente.nombre}</b>
          </p>
        )}
      </div>

      {/* 🎟️ Cupones */}
      {cupones.length > 0 && (
        <div className="pago-section">
          <h2>Cupones disponibles</h2>
          <select
            onChange={(e) => {
              const cupon = cupones.find(
                (c) => c.idcupon === parseInt(e.target.value)
              );
              setCuponSeleccionado(cupon);
              calcularTotal(items, cupon);
            }}
          >
            <option value="">Seleccionar cupón</option>
            {cupones.map((cupon) => (
              <option key={cupon.idcupon} value={cupon.idcupon}>
                {cupon.codigo} - {cupon.descuento}% desc.
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 🧾 Resumen */}
      <div className="pago-section resumen">
        <h2>Resumen del pedido</h2>
        <table>
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
        <h3>Total: ${total}</h3>
      </div>

      {/* 💳 Método de pago */}
      <div className="pago-section">
        <h2>Método de pago</h2>
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
      </div>

      {/* 🔘 Botones finales */}
      <div className="botones-pago">
        <button className="confirmar" onClick={confirmarPago}>
          Confirmar Pago
        </button>
        <button className="cancelar" onClick={cancelarPago}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default Pago;
