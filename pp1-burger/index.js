// index.js
import express from 'express';
import dotenv from 'dotenv';
import sql, { testConnection } from './db.js';
import cors from "cors";

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Middleware para parsear JSON
app.use(cors());
app.use(express.json());

// Verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.json({
    message: 'API de Autoservicio de Hamburguesas',
    status: 'OK',
    timestamp: new Date()
  });
});

// Verificar la conexión a la base de datos
app.get('/db-test', async (req, res) => {
  try {
    // Testear la conexión
    const isConnected = await testConnection();

    if (isConnected) {
      // Si la conexión es exitosa, obtener información de las tablas
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `;

      res.json({
        status: 'OK',
        message: 'Conexión exitosa a la base de datos',
        tables: tables.map(t => t.table_name)
      });
    } else {
      res.status(500).json({
        status: 'ERROR',
        message: 'No se pudo conectar a la base de datos'
      });
    }
  } catch (error) {
    console.error('Error al verificar la conexión:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al verificar la conexión a la base de datos',
      error: error.message
    });
  }
});

// --- ENDPOINTS DE PEDIDOS ---

// 1. Obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const pedidos = await sql`
      SELECT * FROM pedidos
      ORDER BY fecha_hora DESC;
    `;

    res.json({
      status: 'OK',
      data: pedidos
    });
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener pedidos',
      error: error.message
    });
  }
});

// 2. Obtener un pedido específico con detalles completos
app.get('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener la información del pedido con datos relacionados
    const pedido = await sql`
      SELECT 
        p.id_pedido,
        p.fecha_hora,
        p.total,
        p.id_cliente,
        p.id_estado,
        c.nombre as cliente_nombre,
        c.email as cliente_email,
        c.telefono as cliente_telefono,
        ep.nombre as estado
      FROM pedidos p
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN estado_pedido ep ON p.id_estado = ep.id_estado
      WHERE p.id_pedido = ${id};
    `;

    if (pedido.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }

    // Obtener los productos del pedido con sus detalles
    const productos = await sql`
      SELECT 
        pp.id_pedido_producto,
        pp.id_pedido,
        pp.id_producto,
        pp.subtotal,
        pp.cantidad,
        p.nombre,
        p.descripcion,
        p.precio_base,
        cp.nombre as categoria
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      JOIN categoriaproducto cp ON p.idcategoriaproducto = cp.idcategoriaproducto
      WHERE pp.id_pedido = ${id};
    `;

    // Para cada producto, obtener los ingredientes personalizados
    const productosConIngredientes = await Promise.all(
      productos.map(async (producto) => {
        const ingredientes = await sql`
          SELECT 
            ppi.id_pedido_producto,
            ppi.id_ingrediente,
            ppi.cantidad,
            ppi.es_extra,
            i.nombre,
            i.descripcion,
            i.precio,
          FROM pedidos_productos_ingredientes ppi
          JOIN ingredientes i ON ppi.id_ingrediente = i.id_ingrediente
          WHERE ppi.id_pedido_producto = ${producto.id_pedido_producto};
        `;

        return {
          ...producto,
          ingredientes_personalizados: ingredientes
        };
      })
    );

    res.json({
      status: 'OK',
      data: {
        ...pedido[0],
        productos: productosConIngredientes
      }
    });
  } catch (error) {
    console.error(`Error al obtener detalle del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener detalle del pedido ${id}`,
      error: error.message
    });
  }
});

// 3. Crear un nuevo pedido (MODIFICADO)
app.post('/api/pedidos', async (req, res) => {
  const { productos, metodo_pago, id_cliente } = req.body;

  // Validaciones básicas
  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe incluir al menos un producto en el pedido'
    });
  }

  if (!metodo_pago) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe especificar el método de pago'
    });
  }

  // Si no se proporciona cliente, usar el cliente invitado (ID 5 según nuestro script)
  const clienteId = id_cliente || 5;

  // Usar transacción para garantizar la integridad
  try {
    return await sql.begin(async (sql) => {
      let total = 0;

      // Verificar que el cliente existe
      const clienteInfo = await sql`
        SELECT * FROM clientes WHERE id_cliente = ${clienteId};
      `;

      if (clienteInfo.length === 0) {
        throw new Error(`El cliente con ID ${clienteId} no existe`);
      }

      // Obtener el ID del estado "pendiente"
      const estadoPendiente = await sql`
        SELECT id_estado FROM estado_pedido WHERE nombre = 'pendiente';
      `;

      if (estadoPendiente.length === 0) {
        throw new Error('No se encontró el estado "pendiente" en la base de datos');
      }

      // Obtener ID del tipo de pago
      const tipoPago = await sql`
        SELECT idtipopago FROM tipopago WHERE nombre = ${metodo_pago};
      `;

      if (tipoPago.length === 0) {
        throw new Error(`El método de pago "${metodo_pago}" no existe`);
      }

      for (const producto of productos) {
        // Verificar que el producto existe en la BD
        const productoInfo = await sql`
          SELECT * FROM productos 
          WHERE id_producto = ${producto.id_producto};
        `;

        if (productoInfo.length === 0) {
          throw new Error(`El producto con ID ${producto.id_producto} no existe`);
        }

        // ✅ Intentamos tomar el subtotal enviado desde el frontend
        let subtotal = 0;

        if (producto.subtotal !== undefined && producto.subtotal !== null) {
          // Limpia símbolos, convierte coma a punto y parsea número
          subtotal = parseFloat(
            producto.subtotal
              .toString()
              .replace(/[^\d,.-]/g, '') // elimina $ u otros símbolos
              .replace(',', '.')
          );
        }

        // ⚙️ Si no vino válido, usa el precio_base del producto
        if (isNaN(subtotal) || subtotal <= 0) {
          subtotal = parseFloat(productoInfo[0].precio_base);
        }


        producto.subtotal = subtotal;
        total += subtotal;
      }

      


      // Crear nuevo pedido (usando TIMESTAMP en lugar de epoch si ya cambiaste la BD)
      const nuevoPedido = await sql`
        INSERT INTO pedidos (fecha_hora, total, id_cliente, id_estado)
        VALUES (CURRENT_TIMESTAMP, ${total}, ${clienteId}, ${estadoPendiente[0].id_estado})
        RETURNING *;
      `;

      // Crear registro de pago
      const nuevoPago = await sql`
        INSERT INTO pago (idpedido, idtipopago, monto, descripcion)
        VALUES (
          ${nuevoPedido[0].id_pedido}, 
          ${tipoPago[0].idtipopago}, 
          ${total}, 
          ${'Pago pedido #' + nuevoPedido[0].id_pedido}
        )
        RETURNING *;
      `;

      // Insertar productos del pedido (cada producto como fila individual)
      const productosCreados = [];
      for (const producto of productos) {
        const nuevoPedidoProducto = await sql`
          INSERT INTO pedidos_productos (id_pedido, id_producto, subtotal, cantidad)
          VALUES (
            ${nuevoPedido[0].id_pedido}, 
            ${producto.id_producto}, 
            ${producto.subtotal}, 
            1
          )
          RETURNING *;
        `;

        productosCreados.push(nuevoPedidoProducto[0]);

        // Insertar ingredientes personalizados
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            await sql`
              INSERT INTO pedidos_productos_ingredientes (
                id_pedido_producto, 
                id_ingrediente, 
                cantidad, 
                es_extra
              )
              VALUES (
                ${nuevoPedidoProducto[0].id_pedido_producto}, 
                ${ingrediente.id_ingrediente}, 
                ${ingrediente.cantidad}, 
                ${ingrediente.es_extra}
              );
            `;
          }
        }
      }

      return res.status(201).json({
        status: 'OK',
        message: 'Pedido creado correctamente',
        data: {
          id_pedido: nuevoPedido[0].id_pedido,
          fecha_hora: nuevoPedido[0].fecha_hora,
          total: nuevoPedido[0].total,
          id_cliente: nuevoPedido[0].id_cliente,
          id_estado: nuevoPedido[0].id_estado,
          id_pago: nuevoPago[0].id_pago,
          productos_creados: productosCreados.length
        }
      });
    });
  } catch (error) {
    console.error('Error al crear el pedido:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al crear el pedido',
      error: error.message
    });
  }
});

// 4. Actualizar el estado de un pedido (CORREGIDO)
app.patch('/api/pedidos/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  // Validar estados válidos
  const estadosValidos = ['pendiente', 'elaboracion', 'completado', 'entregado'];

  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({
      status: 'ERROR',
      message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
    });
  }

  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;

    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }

    // Obtener el ID del nuevo estado desde la tabla estado_pedido
    const estadoInfo = await sql`
      SELECT id_estado FROM estado_pedido 
      WHERE nombre = ${estado};
    `;

    if (estadoInfo.length === 0) {
      return res.status(400).json({
        status: 'ERROR',
        message: `El estado "${estado}" no existe en la base de datos`
      });
    }

    // Actualizar el estado usando el id_estado
    const pedidoActualizado = await sql`
      UPDATE pedidos
      SET id_estado = ${estadoInfo[0].id_estado}
      WHERE id_pedido = ${id}
      RETURNING *;
    `;

    // Obtener los datos completos del pedido actualizado con el nombre del estado
    const pedidoCompleto = await sql`
      SELECT 
        p.*,
        ep.nombre as estado_nombre
      FROM pedidos p
      JOIN estado_pedido ep ON p.id_estado = ep.id_estado
      WHERE p.id_pedido = ${id};
    `;

    res.json({
      status: 'OK',
      message: `Estado del pedido actualizado a "${estado}"`,
      data: pedidoCompleto[0]
    });
  } catch (error) {
    console.error(`Error al actualizar estado del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al actualizar estado del pedido ${id}`,
      error: error.message
    });
  }
});

// 5. Eliminar un pedido (COMPLETO)
app.delete('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;

    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }

    // Usar transacción para eliminar en cascada
    return await sql.begin(async (sql) => {
      // 1. Obtener todos los pedidos_productos
      const pedidosProductos = await sql`
        SELECT id_pedido_producto FROM pedidos_productos
        WHERE id_pedido = ${id};
      `;

      // 2. Eliminar ingredientes personalizados
      for (const pedidoProducto of pedidosProductos) {
        await sql`
          DELETE FROM pedidos_productos_ingredientes
          WHERE id_pedido_producto = ${pedidoProducto.id_pedido_producto};
        `;
      }

      // 3. Eliminar productos del pedido
      await sql`
        DELETE FROM pedidos_productos
        WHERE id_pedido = ${id};
      `;

      // 4. Eliminar registros de pago asociados
      await sql`
        DELETE FROM pago
        WHERE idpedido = ${id};
      `;

      // 5. Eliminar cupones asociados (si los hay)
      await sql`
        DELETE FROM cupon
        WHERE idpedido = ${id};
      `;

      // 6. Finalmente, eliminar el pedido principal
      const pedidoEliminado = await sql`
        DELETE FROM pedidos
        WHERE id_pedido = ${id}
        RETURNING id_pedido, total;
      `;

      return res.json({
        status: 'OK',
        message: `Pedido con ID ${id} eliminado correctamente`,
        data: {
          id_pedido_eliminado: pedidoEliminado[0].id_pedido,
          total_eliminado: pedidoEliminado[0].total,
          productos_eliminados: pedidosProductos.length
        }
      });
    });
  } catch (error) {
    console.error(`Error al eliminar el pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al eliminar el pedido ${id}`,
      error: error.message
    });
  }
});

//obtener pedidos por CLIENTE

app.get('/api/pedidos/clientes/:id_cliente', async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const pedidos = await sql`
      SELECT * FROM pedidos
      WHERE id_cliente = ${id_cliente}
      ORDER BY fecha_hora DESC;
    `;

    res.json({
      status: 'OK',
      data: pedidos
    });
  } catch (error) {
    console.error(`Error al obtener pedidos del cliente ${id_cliente}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener pedidos del cliente ${id_cliente}`,
      error: error.message
    });
  }
});

// 6. Obtener pedidos por estado
app.get('/api/pedidos/estado/:estado', async (req, res) => {
  const { estado } = req.params;

  const estadosValidos = ['pendiente', 'elaboracion', 'completado', 'entregado'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({
      status: 'ERROR',
      message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
    });
  }

  try {
    const pedidos = await sql`
      SELECT 
        p.id_pedido,
        p.fecha_hora,
        p.total,
        p.id_cliente,
        p.id_estado,
        ep.nombre as estado_nombre,
        c.nombre as cliente_nombre
      FROM pedidos p
      JOIN estado_pedido ep ON p.id_estado = ep.id_estado
      JOIN clientes c ON p.id_cliente = c.id_cliente
      WHERE ep.nombre = ${estado}
      ORDER BY p.fecha_hora DESC;
    `;

    res.json({
      status: 'OK',
      message: `Se encontraron ${pedidos.length} pedidos con estado "${estado}"`,
      data: pedidos
    });
  } catch (error) {
    console.error(`Error al obtener pedidos con estado ${estado}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener pedidos con estado ${estado}`,
      error: error.message
    });
  }
});

// 7. Obtener detalle de un producto específico en un pedido
app.get('/api/pedidos/:idPedido/productos/:idPedidoProducto', async (req, res) => {
  const { idPedido, idPedidoProducto } = req.params;

  try {
    const productoEnPedido = await sql`
      SELECT 
        pp.*,
        p.nombre as producto_nombre,
        p.descripcion as producto_descripcion,
        p.precio_base
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      WHERE pp.id_pedido = ${idPedido} 
        AND pp.id_pedido_producto = ${idPedidoProducto};
    `;

    if (productoEnPedido.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto ${idPedidoProducto} en el pedido ${idPedido}`
      });
    }

    const ingredientes = await sql`
      SELECT 
        ppi.*,
        i.nombre as ingrediente_nombre,
        i.precio as ingrediente_precio
      FROM pedidos_productos_ingredientes ppi
      JOIN ingredientes i ON ppi.id_ingrediente = i.id_ingrediente
      WHERE ppi.id_pedido_producto = ${idPedidoProducto};
    `;

    res.json({
      status: 'OK',
      data: {
        ...productoEnPedido[0],
        ingredientes_personalizados: ingredientes
      }
    });
  } catch (error) {
    console.error(`Error al obtener detalle simple:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener detalle del producto`,
      error: error.message
    });
  }
});

// 8. Obtener estadísticas de pedidos (MODIFICADO al DER nuevo)
app.get('/api/pedidos/estadisticas/resumen', async (req, res) => {
  try {
    // Total de pedidos
    const totalPedidos = await sql`
      SELECT COUNT(*) as total FROM pedidos;
    `;

    // Pedidos por estado (join con estado_pedido)
    const pedidosPorEstado = await sql`
      SELECT ep.nombre as estado, COUNT(*) as cantidad 
      FROM pedidos pd
      JOIN estado_pedido ep ON pd.id_estado = ep.id_estado
      GROUP BY ep.nombre;
    `;

    // Productos más vendidos (ahora se usa la categoría desde categoriaproducto)
    const productosMasVendidos = await sql`
      SELECT p.id_producto, p.nombre, cp.nombre as categoria, 
             COUNT(pp.id_pedido_producto) as unidades_vendidas,
             SUM(pp.subtotal) as ventas_totales
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      JOIN categoriaproducto cp ON p.idcategoriaproducto = cp.idcategoriaproducto
      GROUP BY p.id_producto, p.nombre, cp.nombre
      ORDER BY unidades_vendidas DESC
      LIMIT 5;
    `;

    // Ingredientes extras más solicitados
    const ingredientesMasSolicitados = await sql`
      SELECT i.id_ingrediente, i.nombre,
             SUM(ppi.cantidad) as veces_solicitado
      FROM pedidos_productos_ingredientes ppi
      JOIN ingredientes i ON ppi.id_ingrediente = i.id_ingrediente
      WHERE ppi.es_extra = TRUE
      GROUP BY i.id_ingrediente, i.nombre
      ORDER BY veces_solicitado DESC
      LIMIT 5;
    `;

    // Ventas por método de pago (join con tipopago)
    const ventasPorMetodoPago = await sql`
      SELECT tp.nombre as metodo_pago, COUNT(pg.idpago) as cantidad_pedidos, SUM(pg.monto) as total_ventas
      FROM pago pg
      JOIN tipopago tp ON pg.idtipopago = tp.idtipopago
      GROUP BY tp.nombre;
    `;

    // Productos con más personalizaciones (categoría desde categoriaproducto)
    const productosConMasPersonalizaciones = await sql`
      SELECT p.id_producto, p.nombre, cp.nombre as categoria,
             COUNT(ppi.id_pedido_producto) as total_personalizaciones,
             COUNT(DISTINCT pp.id_pedido_producto) as productos_personalizados
      FROM productos p
      JOIN categoriaproducto cp ON p.idcategoriaproducto = cp.idcategoriaproducto
      JOIN pedidos_productos pp ON p.id_producto = pp.id_producto
      JOIN pedidos_productos_ingredientes ppi ON pp.id_pedido_producto = ppi.id_pedido_producto
      GROUP BY p.id_producto, p.nombre, cp.nombre
      ORDER BY total_personalizaciones DESC
      LIMIT 5;
    `;

    res.json({
      status: 'OK',
      data: {
        total_pedidos: totalPedidos[0].total,
        pedidos_por_estado: pedidosPorEstado,
        productos_mas_vendidos: productosMasVendidos,
        ingredientes_extras_mas_solicitados: ingredientesMasSolicitados,
        ventas_por_metodo_pago: ventasPorMetodoPago,
        productos_con_mas_personalizaciones: productosConMasPersonalizaciones
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de pedidos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener estadísticas de pedidos',
      error: error.message
    });
  }
});


// 9. Agregar productos a un pedido existente (MODIFICADO)
app.post('/api/pedidos/:id/productos', async (req, res) => {
  const { id } = req.params;
  const { productos } = req.body;

  // Validaciones básicas
  if (!productos || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe incluir al menos un producto para agregar al pedido'
    });
  }

  try {
    // Verificar que el pedido existe
    const pedidoExistente = await sql`
      SELECT * FROM pedidos
      WHERE id_pedido = ${id};
    `;

    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }

    // Verificar que el pedido no esté en estado "entregado" o "cancelado"
    if (['entregado', 'cancelado'].includes(pedidoExistente[0].estado)) {
      return res.status(400).json({
        status: 'ERROR',
        message: `No se pueden agregar productos a un pedido en estado "${pedidoExistente[0].estado}"`
      });
    }

    // Usar transacción
    return await sql.begin(async (sql) => {
      let totalAdicional = 0;
      const productosAgregados = [];

      // Calcular subtotales por cada producto individual
      for (const producto of productos) {
        // Verificar que el producto existe y está disponible
        const productoInfo = await sql`
          SELECT * FROM productos 
          WHERE id_producto = ${producto.id_producto} 
          AND disponible = TRUE;
        `;

        if (productoInfo.length === 0) {
          throw new Error(`El producto con ID ${producto.id_producto} no existe o no está disponible`);
        }

        // Calcular precio base (1 unidad por fila)
        let subtotal = productoInfo[0].precio_base;

        // Calcular precios de ingredientes extras
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            // Solo calcular para ingredientes extras
            if (ingrediente.es_extra) {
              const ingredienteInfo = await sql`
                SELECT * FROM ingredientes
                WHERE id_ingrediente = ${ingrediente.id_ingrediente};
              `;

              if (ingredienteInfo.length === 0) {
                throw new Error(`El ingrediente con ID ${ingrediente.id_ingrediente} no existe`);
              }

              // Agregar costo de ingrediente extra
              subtotal += ingredienteInfo[0].precio * ingrediente.cantidad;
            }
          }
        }

        totalAdicional += subtotal;

        // Insertar producto individual
        const nuevoPedidoProducto = await sql`
          INSERT INTO pedidos_productos (id_pedido, id_producto, subtotal, notas)
          VALUES (
            ${id}, 
            ${producto.id_producto}, 
            ${subtotal}, 
            ${producto.notas || null}
          )
          RETURNING *;
        `;

        productosAgregados.push(nuevoPedidoProducto[0]);

        // Insertar ingredientes personalizados
        if (producto.ingredientes_personalizados && producto.ingredientes_personalizados.length > 0) {
          for (const ingrediente of producto.ingredientes_personalizados) {
            await sql`
              INSERT INTO pedidos_productos_ingredientes (
                id_pedido_producto, 
                id_ingrediente, 
                cantidad, 
                es_extra
              )
              VALUES (
                ${nuevoPedidoProducto[0].id_pedido_producto}, 
                ${ingrediente.id_ingrediente}, 
                ${ingrediente.cantidad}, 
                ${ingrediente.es_extra}
              );
            `;
          }
        }
      }

      // Actualizar el total del pedido
      const nuevoTotal = pedidoExistente[0].total + totalAdicional;

      const pedidoActualizado = await sql`
        UPDATE pedidos
        SET total = ${nuevoTotal}
        WHERE id_pedido = ${id}
        RETURNING *;
      `;

      return res.json({
        status: 'OK',
        message: 'Productos agregados correctamente al pedido',
        data: {
          pedido: pedidoActualizado[0],
          productos_agregados: productosAgregados,
          total_adicional: totalAdicional
        }
      });
    });
  } catch (error) {
    console.error(`Error al agregar productos al pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al agregar productos al pedido ${id}`,
      error: error.message
    });
  }
});

app.post("/api/pedidos_productos_ingredientes", async (req, res) => {
  try {
    const { id_pedido_producto, ingredientes } = req.body;

    if (!id_pedido_producto || !ingredientes || ingredientes.length === 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Faltan datos en la solicitud (id_pedido_producto o ingredientes)."
      });
    }

    // Insertar cada ingrediente
    for (const ing of ingredientes) {
      await sql`
        INSERT INTO pedidos_productos_ingredientes 
        (id_pedido_producto, id_ingrediente, cantidad, es_extra)
        VALUES (${id_pedido_producto}, ${ing.id_ingrediente}, ${ing.cantidad}, ${ing.es_extra});
      `;
    }

    res.status(201).json({
      status: "OK",
      message: "Ingredientes guardados correctamente para el producto del pedido."
    });
  } catch (error) {
    console.error("Error al registrar ingredientes del pedido:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Error interno al registrar ingredientes.",
      error: error.message
    });
  }
});


// 10. Eliminar un producto específico de un pedido
app.delete('/api/pedidos/:id/productos/:idPedidoProducto', async (req, res) => {
  const { id, idPedidoProducto } = req.params;

  try {
    // Verificar que el pedido existe y traer su estado
    const pedidoExistente = await sql`
      SELECT p.*, e.nombre AS estado_nombre
      FROM pedidos p
      JOIN estado_pedido e ON p.id_estado = e.id_estado
      WHERE p.id_pedido = ${id};
    `;

    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }

    // Verificar que el producto existe en el pedido
    const productoEnPedido = await sql`
      SELECT * FROM pedidos_productos
      WHERE id_pedido = ${id} AND id_pedido_producto = ${idPedidoProducto};
    `;

    if (productoEnPedido.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto en el pedido ${id}`
      });
    }

    // Verificar que el pedido no esté entregado o cancelado
    if (['entregado', 'cancelado'].includes(pedidoExistente[0].estado_nombre.toLowerCase())) {
      return res.status(400).json({
        status: 'ERROR',
        message: `No se pueden eliminar productos de un pedido en estado "${pedidoExistente[0].estado_nombre}"`
      });
    }

    // Usar transacción para eliminar
    return await sql.begin(async (sql) => {
      const subtotalEliminado = productoEnPedido[0].subtotal;

      // Eliminar ingredientes personalizados del producto
      await sql`
        DELETE FROM pedidos_productos_ingredientes
        WHERE id_pedido_producto = ${idPedidoProducto};
      `;

      // Eliminar el producto del pedido
      await sql`
        DELETE FROM pedidos_productos
        WHERE id_pedido_producto = ${idPedidoProducto};
      `;

      // Actualizar el total del pedido
      const nuevoTotal = pedidoExistente[0].total - subtotalEliminado;

      const pedidoActualizado = await sql`
        UPDATE pedidos
        SET total = ${nuevoTotal}
        WHERE id_pedido = ${id}
        RETURNING *;
      `;

      return res.json({
        status: 'OK',
        message: 'Producto eliminado correctamente del pedido',
        data: {
          pedido: pedidoActualizado[0],
          subtotal_eliminado: subtotalEliminado
        }
      });
    });
  } catch (error) {
    console.error(`Error al eliminar producto ${idPedidoProducto} del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al eliminar producto del pedido`,
      error: error.message
    });
  }
});



// 11. Filtrar pedidos por rango de fechas
app.get('/api/pedidos/filtro/fecha', async (req, res) => {
  const { desde, hasta } = req.query;

  // Validar fechas
  if (!desde || !hasta) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Debe proporcionar fechas de inicio y fin (desde, hasta) en formato válido (YYYY-MM-DD o timestamp)'
    });
  }

  try {
    const pedidos = await sql`
      SELECT 
        p.id_pedido,
        p.fecha_hora,
        p.total,
        c.nombre AS cliente,
        e.nombre AS estado
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      JOIN estado_pedido e ON p.id_estado = e.id_estado
      WHERE p.fecha_hora >= ${desde} AND p.fecha_hora <= ${hasta}
      ORDER BY p.fecha_hora DESC;
    `;

    res.json({
      status: 'OK',
      cantidad: pedidos.length,
      data: pedidos
    });
  } catch (error) {
    console.error('Error al filtrar pedidos por fecha:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al filtrar pedidos por fecha',
      error: error.message
    });
  }
});


// 12. Obtener resumen de productos en un pedido
app.get('/api/pedidos/:id/resumen', async (req, res) => {
  const { id } = req.params;

  try {
    // Traer pedido con cliente y estado
    const pedidoExistente = await sql`
      SELECT p.id_pedido, p.fecha_hora, p.total,
             c.nombre AS cliente,
             e.nombre AS estado
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      JOIN estado_pedido e ON p.id_estado = e.id_estado
      WHERE p.id_pedido = ${id};
    `;

    if (pedidoExistente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el pedido con ID ${id}`
      });
    }

    // Resumen agrupado
    const resumenProductos = await sql`
      SELECT p.id_producto, p.nombre, p.precio_base,
             CAST(COUNT(pp.id_pedido_producto) AS int) as cantidad_total,
             SUM(pp.subtotal) as subtotal_total,
             ROUND(AVG(pp.subtotal),2) as precio_promedio_personalizado
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      WHERE pp.id_pedido = ${id}
      GROUP BY p.id_producto, p.nombre, p.precio_base
      ORDER BY cantidad_total DESC, p.nombre;
    `;

    // Detalles de cada producto
    const productosDetallados = await sql`
      SELECT pp.id_pedido_producto, pp.id_producto, p.nombre, 
             pp.subtotal,
             CASE 
               WHEN COUNT(DISTINCT ppi.id_ingrediente) > 0 THEN true 
               ELSE false 
             END as tiene_personalizaciones
      FROM pedidos_productos pp
      JOIN productos p ON pp.id_producto = p.id_producto
      LEFT JOIN pedidos_productos_ingredientes ppi ON pp.id_pedido_producto = ppi.id_pedido_producto
      WHERE pp.id_pedido = ${id}
      GROUP BY pp.id_pedido_producto, pp.id_producto, p.nombre, pp.subtotal
      ORDER BY p.nombre, pp.id_pedido_producto;
    `;

    res.json({
      status: 'OK',
      data: {
        pedido: pedidoExistente[0],
        resumen_por_producto: resumenProductos,
        productos_detallados: productosDetallados
      }
    });
  } catch (error) {
    console.error(`Error al obtener resumen del pedido ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener resumen del pedido ${id}`,
      error: error.message
    });
  }
});


// 8. Filtrar pedidos por método de pago (CORREGIDO)
app.get('/api/pedidos/metodo-pago/:metodo', async (req, res) => {
  const { metodo } = req.params;

  try {
    // Buscar pedidos con ese método de pago usando JOINs correctos
    const pedidos = await sql`
      SELECT 
        p.id_pedido,
        p.fecha_hora,
        p.total,
        p.id_cliente,
        p.id_estado,
        c.nombre as cliente_nombre,
        ep.nombre as estado_nombre,
        tp.nombre as metodo_pago,
        pago.monto as monto_pago,
        pago.descripcion as descripcion_pago
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      JOIN estado_pedido ep ON p.id_estado = ep.id_estado
      JOIN pago ON p.id_pedido = pago.idpedido
      JOIN tipopago tp ON pago.idtipopago = tp.idtipopago
      WHERE tp.nombre = ${metodo}
      ORDER BY p.fecha_hora DESC;
    `;

    if (pedidos.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontraron pedidos con el método de pago "${metodo}"`
      });
    }

    res.json({
      status: 'OK',
      message: `Se encontraron ${pedidos.length} pedidos con método de pago "${metodo}"`,
      data: pedidos
    });
  } catch (error) {
    console.error('Error al filtrar pedidos por método de pago:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al filtrar pedidos por método de pago',
      error: error.message
    });
  }
});





// --- ENDPOINTS DE PRODUCTOS ---

// 13. Obtener todos los productos disponibles
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await sql`
      SELECT 
        p.id_producto,
        p.nombre,
        p.descripcion,
        p.precio_base,
        p.idcategoriaproducto,
        c.nombre as categoria
      FROM productos p
      JOIN categoriaproducto c ON p.idcategoriaproducto = c.idcategoriaproducto
      ORDER BY p.id_producto;
    `;
    /* console.log("Productos encontrados:", productos.length); */

    res.json({
      status: 'OK',
      data: productos
    });

  } catch (error) {
    console.error("Error al obtener productos:", error.stack);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener productos',
      error: error.message
    });
  }
});

// 14. Obtener un producto específico con sus ingredientes base
app.get('/api/productos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Obtener información del producto
    const producto = await sql`
      SELECT * FROM productos
      WHERE id_producto = ${id};
    `;

    if (producto.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto con ID ${id}`
      });
    }

    // Obtener ingredientes base del producto
    const ingredientesBase = await sql`
      SELECT pib.cantidad, i.id_ingrediente, i.nombre, i.descripcion, 
             i.precio
      FROM productos_ingredientes_base pib
      JOIN ingredientes i ON pib.id_ingrediente = i.id_ingrediente
      WHERE pib.id_producto = ${id}
      ORDER BY i.nombre;
    `;

    res.json({
      status: 'OK',
      data: {
        ...producto[0],
        ingredientes_base: ingredientesBase
      }
    });
  } catch (error) {
    console.error(`Error al obtener producto ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener producto ${id}`,
      error: error.message
    });
  }
});

// 15. Obtener productos por categoría (CORREGIDO)
app.get('/api/productos/categoria/:categoria', async (req, res) => {
  const { categoria } = req.params;

  try {
    // Buscar productos usando JOIN con la tabla categoriaproducto
    const productos = await sql`
      SELECT 
        p.id_producto,
        p.nombre as producto_nombre,
        p.descripcion as producto_descripcion,
        p.precio_base,
        p.idcategoriaproducto,
        cp.nombre as categoria_nombre
      FROM productos p
      JOIN categoriaproducto cp ON p.idcategoriaproducto = cp.idcategoriaproducto
      WHERE LOWER(cp.nombre) = LOWER(${categoria})
      ORDER BY p.id_producto;
    `;

    if (productos.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontraron productos en la categoría "${categoria}"`
      });
    }

    res.json({
      status: 'OK',
      message: `Se encontraron ${productos.length} productos en la categoría "${categoria}"`,
      data: productos
    });
  } catch (error) {
    console.error(`Error al obtener productos de categoría ${categoria}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener productos de categoría ${categoria}`,
      error: error.message
    });
  }
});




// --- ENDPOINTS DE INGREDIENTES ---

// 16. Obtener todos los ingredientes disponibles
app.get('/api/ingredientes', async (req, res) => {
  try {
    const ingredientes = await sql`
      SELECT * FROM ingredientes
      ORDER BY id_ingrediente;
    `;

    res.json({
      status: 'OK',
      data: ingredientes
    });
  } catch (error) {
    console.error('Error al obtener ingredientes:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener ingredientes',
      error: error.message
    });
  }
});

// 17. Obtener un ingrediente específico
app.get('/api/ingredientes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const ingrediente = await sql`
      SELECT * FROM ingredientes
      WHERE id_ingrediente = ${id};
    `;

    if (ingrediente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el ingrediente con ID ${id}`
      });
    }

    res.json({
      status: 'OK',
      data: ingrediente[0]
    });
  } catch (error) {
    console.error(`Error al obtener ingrediente ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener ingrediente ${id}`,
      error: error.message
    });
  }
});

// --- ENDPOINTS DE CLIENTES ---
//obtener todos los clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await sql`
      SELECT * FROM clientes
      ORDER BY nombre;
    `;

    res.json({
      status: 'OK',
      data: clientes
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener clientes',
      error: error.message
    });
  }
});

// Obtener un clientes por dni
// Buscar cliente + cupones por DNI
app.get('/api/cupones/clientes/:dni', async (req, res) => {
  const { dni } = req.params;

  try {
    const cupones = await sql`
      SELECT c.*, cl.nombre
      FROM cupon c
      JOIN clientes cl ON cl.id_cliente = c.id_cliente
      WHERE cl.dni = ${dni}
      AND (c.fechavencimiento IS NULL OR c.fechavencimiento >= CURRENT_DATE)
      ORDER BY c.fechavencimiento;
    `;

    if (!cupones.length)
      return res.status(404).json({ status: 'ERROR', message: 'No hay cupones' });

    res.json({ status: 'OK', data: cupones });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'ERROR', message: 'Error del servidor' });
  }
});



// 17. Obtener un clientes específico
// Obtener un cliente específico
app.get('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const cliente = await sql`
      SELECT * FROM clientes
      WHERE id_cliente = ${id};
    `;

    if (cliente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el cliente con ID ${id}`
      });
    }

    res.json({
      status: 'OK',
      data: cliente[0]
    });
  } catch (error) {
    console.error(`Error al obtener cliente ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener cliente ${id}`,
      error: error.message
    });
  }
});


// --- ENDPOINTS ADICIONALES ---

// obetener cupon por id cliente
app.get('/api/cupones/clientes/:id_cliente', async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const cliente = await sql`
      SELECT * FROM cupon
      WHERE id_cliente = ${id_cliente};
    `;

    if (cliente.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el cupon ${id_cliente}`
      });
    }

    res.json({
      status: 'OK',
      data: cliente[0]
    });
  } catch (error) {
    console.error(`Error al obtener cupon ${id_cliente}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener cupon ${id_cliente}`,
      error: error.message
    });
  }
});




// 18. Obtener todas las categorías de productos
app.get('/api/categorias', async (req, res) => {
  try {
    const categorias = await sql`
      SELECT DISTINCT categoria 
      FROM productos 
      WHERE disponible = TRUE
      ORDER BY categoria;
    `;

    res.json({
      status: 'OK',
      data: categorias.map(c => c.categoria)
    });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
});

// 19. Calcular precio estimado de un producto personalizado
app.post('/api/productos/:id/calcular-precio', async (req, res) => {
  const { id } = req.params;
  const { ingredientes_personalizados } = req.body;

  try {
    // Obtener información del producto base
    const producto = await sql`
      SELECT * FROM productos
      WHERE id_producto = ${id} AND disponible = TRUE;
    `;

    if (producto.length === 0) {
      return res.status(404).json({
        status: 'ERROR',
        message: `No se encontró el producto con ID ${id}`
      });
    }

    let precioTotal = producto[0].precio_base;
    const detallePrecios = [{
      concepto: 'Precio base',
      precio: producto[0].precio_base
    }];

    // Calcular precios de ingredientes extras
    if (ingredientes_personalizados && ingredientes_personalizados.length > 0) {
      for (const ingrediente of ingredientes_personalizados) {
        if (ingrediente.es_extra) {
          const ingredienteInfo = await sql`
            SELECT * FROM ingredientes
            WHERE id_ingrediente = ${ingrediente.id_ingrediente};
          `;

          if (ingredienteInfo.length > 0) {
            const costoExtra = ingredienteInfo[0].precio * ingrediente.cantidad;
            precioTotal += costoExtra;
            detallePrecios.push({
              concepto: `Extra ${ingredienteInfo[0].nombre} (${ingrediente.cantidad} ${ingredienteInfo[0]})`,
              precio: costoExtra
            });
          }
        }
      }
    }

    res.json({
      status: 'OK',
      data: {
        producto: producto[0].nombre,
        precio_total: precioTotal,
        detalle_precios: detallePrecios
      }
    });
  } catch (error) {
    console.error(`Error al calcular precio del producto ${id}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al calcular precio del producto`,
      error: error.message
    });
  }
});

// 20. Obtener historial de pedidos de un método de pago específico
app.get('/api/pedidos/metodo-pago/:metodo', async (req, res) => {
  const { metodo } = req.params;

  try {
    const pedidos = await sql`
      SELECT * FROM pedidos
      WHERE metodo_pago = ${metodo}
      ORDER BY fecha_hora DESC;
    `;

    res.json({
      status: 'OK',
      data: pedidos
    });
  } catch (error) {
    console.error(`Error al obtener pedidos con método de pago ${metodo}:`, error);
    res.status(500).json({
      status: 'ERROR',
      message: `Error al obtener pedidos con método de pago ${metodo}`,
      error: error.message
    });
  }
});

// Iniciar el servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);

  // Verificar la conexión a la base de datos al iniciar
  await testConnection();

  // Cerrar el proceso si no se puede conectar a la base de datos
  process.on('SIGINT', async () => {
    console.log('Cerrando conexiones a la base de datos...');
    await sql.end();
    process.exit(0);
  });
});

export default app;