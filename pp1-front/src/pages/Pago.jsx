import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../estilos/pago.css";

export const Pago = () => {
  const [dni, setDni] = useState("");
  const [cliente, setCliente] = useState(null);
  const [cupones, setCupones] = useState([]);
  const [cuponSeleccionado, setCuponSeleccionado] = useState(null);
  const [metodoPago, setMetodoPago] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate(); // para redirigir tras el pago

  useEffect(() => {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    setItems(carrito);
    calcularTotal(carrito);
  }, []);

  const calcularTotal = (carrito, cupon = null) => {
    let subtotal = carrito.reduce((acc, item) => {
      // Obtener precio en formato texto o número
      const precioBruto = item.subtotal || item.precio || 0;

      // Convertir correctamente tanto "$5,70" como "5.70"
      const valor = parseFloat(
        precioBruto
          .toString()
          .replace("$", "")
          .replace(",", ".") // <- importante: convierte coma a punto
      );

      return acc + (isNaN(valor) ? 0 : valor);
    }, 0);

    // Aplicar descuento si hay cupón
    if (cupon && cupon.descuento) {
      subtotal -= subtotal * (cupon.descuento / 100);
    }

    // Guardar total con coma (para mostrar como "$5,70")
    const totalFormateado = subtotal.toFixed(2).replace(".", ",");
    setTotal(totalFormateado);
  };


  const buscarCliente = async () => {
    if (!dni) {
      alert("Por favor ingrese un DNI válido");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/cupones/clientes/${dni}`);
      const data = await res.json();

      if (data.status === "OK" && data.data.length > 0) {
        const clienteEncontrado = data.data[0];
        setCliente({
          id_cliente: clienteEncontrado.id_cliente, // ✅ importante
          nombre: clienteEncontrado.nombre,
          dni: clienteEncontrado.dni,
        });

        setCupones(data.data); // cupones asociados a ese cliente
      } else {
        setCliente(null);
        setCupones([]);
        alert("Cliente no encontrado o sin cupones disponibles");
      }
    } catch (error) {
      console.error("Error al buscar cliente:", error);
    }
  };


  const confirmarPago = async () => {
    if (!metodoPago) {
      alert("Seleccioná un método de pago para continuar.");
      return;
    }

    try {
      const productos = items.map((item) => ({
        id_producto: item.id_producto || item.id,
        ingredientes_personalizados: item.ingredientes_personalizados || [],
        subtotal: parseFloat(
          (item.subtotal || item.precio || "0")
            .toString()
            .replace("$", "")
            .replace(",", ".")
        ),
      }));

      // ✅ Calcular el total original
      const totalSinDescuento = productos.reduce(
        (acc, p) => acc + (p.subtotal || 0),
        0
      );

      // ✅ Aplicar descuento como porcentaje real
      let descuento = 0;
      let totalFinal = totalSinDescuento;

      if (cuponSeleccionado && cuponSeleccionado.descuento) {
        const porcentaje = parseFloat(cuponSeleccionado.descuento);
        if (!isNaN(porcentaje) && porcentaje > 0) {
          descuento = (totalSinDescuento * porcentaje) / 100; // 🔹 calculamos monto de descuento
          totalFinal = totalSinDescuento - descuento;
        }
      }

      const pedidoBody = {
        productos,
        metodo_pago: metodoPago,
        id_cliente:
          cuponSeleccionado && cliente
            ? cliente.id_cliente
            : 7, // cliente genérico
        total: parseFloat(totalFinal.toFixed(2)),  // 🔹 aseguramos número válido
        cupon: cuponSeleccionado ? cuponSeleccionado.codigo : null,
        descuento: parseFloat(descuento.toFixed(2)), // 🔹 enviamos monto descontado
      };

      const response = await fetch("http://localhost:3000/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoBody),
      });

      const data = await response.json();

      if (data.status === "OK") {
        // limpiamos el carrito
        localStorage.removeItem("carrito");
        // navegamos al ticket animado
        navigate(`/PagoExitoso/${data.data.id_pedido}`);
      }

    } catch (error) {
      console.error("Error al confirmar el pedido:", error);
      alert("Ocurrió un error al procesar el pedido.");
    }
  };


  return (
    <div className="pago-container">
      {/* <h1 className="pago-titulo">Finalizá tu Pedido</h1> */}

      {/* 🔎 DNI y descuentos */}
      <section className="pago-section">
        <h2>¿Eres socio McBurger?</h2>
        <p className="texto-secundario">Ingresá tu DNI para ver tus descuentos o cupones disponibles.</p>
        <div className="dni-busqueda">
          <input
            type="text"
            placeholder="Ingrese su DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <button className="btn-buscar" onClick={buscarCliente}>Buscar</button>
        </div>

        {cliente && (
          <div className="cliente-info">
            <p><b>Socio:</b> {cliente.nombre}</p>
            {/* <p><b>DNI:</b> {cliente.dni}</p> */}
          </div>
        )}
      </section>

      {/* 🎟️ Cupones */}
      {cupones.length > 0 && (
        <section className="pago-section">
          <div className="cupones-container">
            {cupones.map((cupon) => (
              <div
                key={cupon.idcupon}
                className={`cupon-card ${cuponSeleccionado?.idcupon === cupon.idcupon ? "seleccionado" : ""}`}
                onClick={() => {
                  setCuponSeleccionado(cupon);
                  calcularTotal(items, cupon);
                }}
              >
                {/* <h3>{cupon.codigo}</h3> */}
                <p>Descuento: <b>{cupon.descuento}%</b></p>
                {/* <p className="cupon-detalle">Válido hasta {cupon.fechavencimiento}</p> */}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 💰 Total */}
      <section className="pago-section total">
        <h2>Total a pagar</h2>
        <h3 className="total-final">${total}</h3>

      </section>

      {/* 💳 Métodos de pago */}
      <div className="metodos-pago">
        <h2>Elegí tu método de pago</h2>

        <div className="metodos-container">
          <div
            className={`metodo-card ${metodoPago === "efectivo" ? "seleccionado" : ""}`}
            onClick={() => setMetodoPago("efectivo")}
          >
            <div className="metodo-imagen">
              <img src="/imagenes/efectivo.png" alt="Pago en efectivo" />
            </div>
            <div className="metodo-info">
              <h3>Efectivo</h3>
            </div>
          </div>

          <div
            className={`metodo-card ${metodoPago === "mercadopago" ? "seleccionado" : ""}`}
            onClick={() => setMetodoPago("mercadopago")}
          >
            <div className="metodo-imagen">
              <img src="/imagenes/mercadopago.png" alt="Pago con Mercado Pago" />
            </div>
            <div className="metodo-info">
              <h3>Mercado Pago</h3>
            </div>
          </div>
        </div>

        {!metodoPago && (
          <p className="mensaje-seleccion">Seleccioná un método de pago para continuar.</p>
        )}

        {/* 🔘 Botón dinámico según método */}
        {metodoPago && (
          <div className="accion-pago">
            {metodoPago === "efectivo" ? (
              <button className="btn-grande btn-efectivo" onClick={confirmarPago}>
                Pagar
              </button>
            ) : (
              <button className="btn-grande btn-mp" onClick={confirmarPago}>
                Escanear QR
              </button>
            )}
          </div>
        )}
      </div>


      {/* 🔘 Botones finales */}
      <div className="botones-pago">
        <Link to="/Carrito">
          <button className="btn cancelar">Cancelar</button>
        </Link>
      </div>
    </div>
  );
};

export default Pago;
