const express = require('express');
const bodyParser = require('body-parser');
const { UserController} = require('./controllers/UserController');
const { CategoryController} = require('./controllers/CategoryController');
const { ProductController } = require('./controllers/ProductController');
const { CartController } = require('./controllers/CartController');
const InicioController = require('./controllers/InicioController');
const UserService = require('./services/UserService');
const CategoryService = require('./services/CategoryService');
const ProductService = require('./services/ProductService');
const CartService = require('./services/CartService');
const { CheckoutController } = require('./controllers/CheckoutController');
const path = require('path');
const upload = require('./config/uploadConfig');
const app = express();
const session = require('express-session');
app.use(express.static('public'));
const db = require('./models/User'); 
const nodemailer = require('nodemailer');


// Configuraciones
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(CartController.getCartItemCount);

// Verificación de la carpeta uploads
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
    console.log('Carpeta uploads creada exitosamente');
} else {
    console.log('La carpeta uploads ya existe');
}

// Añade esto después de tus importaciones
const multerErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).render('error', {
        message: 'Error al subir archivo',
        error: err
      });
    }
    next(err);
  };

// Middleware para manejar errores
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        message: 'Algo salió mal!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
};

// Rutas principales
app.get('/', (req, res, next) => {
    const inicioController = require('./controllers/InicioController');
    inicioController.index(req, res);
});


/****************EMAIL************ */
// routes/checkout.js

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Configuración de sesión
app.use(session({
    secret: 'tu_secreto_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Middleware para inicializar el carrito
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});
// Middleware para verificar si el usuario está autenticado
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mirandamarcela578@gmail.com', // Cambia esto por tu correo de Gmail
        pass: 'vipdfjbfhniyvhck' // Cambia esto por tu contraseña de aplicación
    }
});

// Ruta para procesar el pago
app.post('/process-payment', async (req, res) => {
    try {
        const { shippingInfo } = req.body;
        
        // Debug log
        console.log('Sesión:', req.session);
        console.log('Carrito antes del procesamiento:', req.session.cart);

        // Verificar carrito
        if (!req.session.cart || !Array.isArray(req.session.cart)) {
            throw new Error('Carrito no válido');
        }

        // Obtener items y calcular total
        const cartItems = req.session.cart;
        let total = 0;
        let productsHtml = '';

        // Procesar cada item
        for (const item of cartItems) {
            console.log('Procesando item:', item); // Debug
            const itemPrice = Number(item.price);
            const itemQuantity = Number(item.quantity);
            const itemTotal = itemPrice * itemQuantity;
            total += itemTotal;

            productsHtml += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${itemQuantity}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Bs. ${itemPrice.toFixed(2)}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Bs. ${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        }

        console.log('Total calculado:', total); // Debug

        // Enviar correo
        const mailOptions = {
            from: 'tucorreo@gmail.com',
            to: shippingInfo.email,
            subject: 'Confirmación de Compra - GoGo Play',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #334488; text-align: center;">Confirmación de Compra - GoGo Play</h1>
                    <p>Gracias por tu compra, ${shippingInfo.name}!</p>
                    
                    <div style="margin: 20px 0;">
                        <h2 style="color: #334488;">Detalles del pedido:</h2>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: left;">Producto</th>
                                    <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
                                    <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: right;">Precio</th>
                                    <th style="padding: 12px 8px; border: 1px solid #ddd; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${productsHtml}
                            </tbody>
                            <tfoot>
                                <tr style="font-weight: bold; background-color: #f8f9fa;">
                                    <td colspan="3" style="padding: 12px 8px; border: 1px solid #ddd; text-align: right;">Total:</td>
                                    <td style="padding: 12px 8px; border: 1px solid #ddd; text-align: right;">Bs. ${total.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 4px;">
                        <h2 style="color: #334488; margin-top: 0;">Detalles de envío:</h2>
                        <p><strong>Dirección:</strong> ${shippingInfo.address}</p>
                        <p><strong>Ciudad:</strong> ${shippingInfo.city}</p>
                        <p><strong>Teléfono:</strong> ${shippingInfo.phone}</p>
                    </div>

                    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
                        Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Limpiar el carrito después de enviar el correo
        req.session.cart = [];
        await req.session.save();
        
        res.json({
            success: true,
            message: 'Pago procesado y correo enviado exitosamente',
            total: total
        });

    } catch (error) {
        console.error('Error en proceso de pago:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar el pago: ' + error.message
        });
    }
});

// Añade esto temporalmente a tu app.js
app.get('/check-cart', (req, res) => {
    console.log('Sesión completa:', req.session);
    console.log('Carrito:', req.session.cart);
    res.json(req.session.cart || []);
});
/***************CATALOGO* SESIONES MIDLEWARE******************** */
// Middleware para manejar datos de sesión y carrito
/*const handleSessionData = async (req, res, next) => {
    // Hacer disponible el usuario en todas las vistas
    res.locals.user = req.session.user || null;
    res.locals.cartItemCount = 0;

    // Si hay usuario, obtener datos del carrito
    if (req.session.user) {
        CartService.getOrCreateCart(req.session.user.id, (err, cart) => {
            if (err) {
                console.error('Error al obtener carrito:', err);
                return next();
            }

            CartService.getCartContents(cart.id, (err, items) => {
                if (err) {
                    console.error('Error al obtener items del carrito:', err);
                    return next();
                }

                res.locals.cartItemCount = items ? items.length : 0;
                next();
            });
        });
    } else {
        next();
    }
};

module.exports = handleSessionData;

// En tu app.js
const handleSessionData = require('./middleware/sessionMiddleware');

// Usar el middleware después de configurar la sesión
app.use(handleSessionData);*/

// Ruta para el catálogo
app.get('/catalogo', (req, res, next) => {
    // Primero obtener las categorías
    CategoryService.getAllCategories((catErr, categories) => {
        if (catErr) {
            console.error('Error al obtener categorías:', catErr);
            return next(catErr);
        }

        // Luego obtener los productos
        ProductService.getAllProducts((prodErr, products) => {
            if (prodErr) {
                console.error('Error al obtener productos:', prodErr);
                return next(prodErr);
            }

            // Renderizar la vista con ambos datos
            res.render('products/catalogo', {
                title: 'Catálogo de Productos',
                products: products || [],
                categories: categories || [],
                category: null,
                searchTerm: null
            });
        });
    });
});

// Ruta para productos destacados con límite opcional
app.get('/destacado', (req, res, next) => {
    // Obtener el límite de la query string (si existe)
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    // Obtener las categorías
    CategoryService.getAllCategories((catErr, categories) => {
        if (catErr) {
            console.error('Error al obtener categorías:', catErr);
            return next(catErr);
        }

        // Obtener los productos destacados con el límite especificado
        ProductService.getFeaturedProducts((prodErr, products) => {
            if (prodErr) {
                console.error('Error al obtener productos destacados:', prodErr);
                return next(prodErr);
            }

            // Renderizar la vista con los datos
            res.render('products/destacado', {
                title: 'Productos Destacados',
                products: products || [],
                categories: categories || [],
                category: null,
                searchTerm: null,
                currentLimit: limit
            });
        });
    });
});


// Rutas para usuarios
app.get('/users', UserController.index);
app.get('/users/create', UserController.create);
app.post('/users', upload.single('imagen'), UserController.store);
app.get('/users/:id', UserController.show);
app.get('/users/:id/edit', UserController.edit);
app.post('/users/:id', upload.single('imagen'), UserController.update);
app.post('/users/:id/delete', UserController.delete);

// Rutas de autenticación
/*app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    UserService.validateUser(username, password, (err, user) => {
        if (err) throw err;
        if (user) {
            res.redirect('/');
        } else {
            res.render('login', { error: 'Credenciales inválidas' });
        }
    });
});*/
// Asegúrate de tener estos middleware configurados
/*app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Configuración de sesión
app.use(session({
    secret: 'tu_secreto_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));*/

// Middleware para verificar autenticación
const checkAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    // Guardar la URL original para redireccionar después del login
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};
// Middleware para hacer disponible el usuario en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cartItemCount = 0; // Valor por defecto
    next();
});

// Después de esto, aplica tu middleware getCartItemCount
app.use(CartController.getCartItemCount);

// Ruta para verificar autenticación
app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({
            success: true,
            user: req.session.user
        });
    }
    return res.status(401).json({
        success: false,
        message: 'No has iniciado sesión'
    });
});

// Rutas de login existentes modificadas
/*app.get('/login', (req, res) => {
    res.render('login', { returnTo: req.session.returnTo || '/' });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    UserService.validateUser(username, password, (err, user) => {
        if (err) throw err;
        if (user) {
            // Guardar usuario en sesión
            req.session.user = {
                id: user.id,
                username: user.username
                // Añade otros campos necesarios
            };
            
            // Verificar si la solicitud viene del carrito
            if (req.session.returnTo && req.session.returnTo.includes('cart')) {
                // Si viene del carrito, redirigir al checkout
                delete req.session.returnTo;
                res.redirect('/checkout');
            } else {
                // Si no viene del carrito, usar la redirección normal
                const returnTo = req.session.returnTo || '/';
                delete req.session.returnTo;
                res.redirect(returnTo);
            }
        } else {
            res.render('login', { 
                error: 'Credenciales inválidas',
                returnTo: req.session.returnTo || '/'
            });
        }
    });
});

// Ruta GET para mostrar el formulario de login
app.get('/login', (req, res) => {
    // Obtener las categorías
    CategoryService.getAll((err, categories) => {
        if (err) {
            console.error('Error al obtener categorías:', err);
            // Si hay error, renderizar sin categorías
            return res.render('login', {
                title: 'Iniciar Sesión',
                categories: []
            });
        }
        
        // Renderizar con las categorías
        res.render('login', {
            title: 'Iniciar Sesión',
            categories: categories || []
        });
    });
});**/
// Middleware para cargar categorías
/*app.use(async (req, res, next) => {
    try {
        // Pasar un array vacío por defecto si no hay categorías
        res.locals.categories = [];
        next();
    } catch (error) {
        console.error('Error al cargar categorías:', error);
        next();
    }
});*/

// Middleware para obtener categorías
app.use((req, res, next) => {
    CategoryService.getAllCategories(function (err, categories) {
        if (err) {
            console.error('Error al obtener categorías:', err);
            res.locals.categories = []; // Asignar un array vacío en caso de error
        } else {
            res.locals.categories = categories || []; // Asegurarse de que sea un array
        }
        next(); // Continuar con la siguiente middleware o ruta
    });
});
// Ruta de login
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Iniciar Sesión'
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    UserService.validateUser(username, password, (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error en el servidor'
            });
        }
        if (user) {
            // Guardar usuario en sesión
            req.session.user = {
                id: user.id,
                username: user.username,
                imagen: user.imagen, // Asegúrate de incluir la imagen si existe
                name: user.name
            };
            
            return res.json({
                success: true,
                message: 'Login exitoso',
                user: {
                    id: user.id,
                    username: user.username
                }
            });
        } else {
            /*return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });*/
            // Verificar si el usuario existe
            db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Error en el servidor'
                    });
                }

                if (!existingUser) {
                    // Si el usuario no existe, sugerir registro
                    return res.status(401).json({
                        success: false,
                        message: 'Usuario no encontrado. ¿Deseas registrarte?',
                        needsRegistration: true
                    });
                } else {
                    // Si el usuario existe pero la contraseña es incorrecta
                    return res.status(401).json({
                        success: false,
                        message: 'Credenciales inválidas'
                    });
                }
            });
        }
    });
});

// Ruta de logout
/*app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});*/

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).render('error', {
                message: 'Error al cerrar sesión'
            });
        }
        res.redirect('/');
    });
});

// Ruta para procesar el pago (protegida)
/*app.post('/process-payment', checkAuth, async (req, res) => {
    try {
        // Aquí va tu lógica de procesamiento de pago
        const user = req.session.user;
        
        // Ejemplo de procesamiento de pago
        const paymentResult = await processPayment({
            userId: user.id,
            // otros datos necesarios
        });

        res.json({
            success: true,
            message: 'Pago procesado exitosamente',
            data: paymentResult
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al procesar el pago',
            error: error.message
        });
    }
});

// Ruta para la página de pago (protegida)
app.get('/checkout', checkAuth, (req, res) => {
    res.render('checkout', {
        user: req.session.user
    });
});*/

// Añade estas rutas en tu app.js

// Función para obtener datos disponibles del usuario
function getUserData(userId, callback) {
    db.get(
        `SELECT id, name, email 
         FROM users 
         WHERE id = ?`,
        [userId],
        callback
    );
}
/*
app.get('/checkout', checkAuth, (req, res) => {
    const userId = req.session.user.id;

    // Obtener datos del usuario
    getUserData(userId, (err, userData) => {
        if (err) {
            console.error('Error al obtener datos del usuario:', err);
            return res.status(500).render('error', {
                message: 'Error al cargar datos del usuario'
            });
        }

        CartService.getOrCreateCart(userId, (err, cart) => {
            if (err) {
                console.error('Error al obtener carrito:', err);
                return res.status(500).render('error', {
                    message: 'Error al cargar el checkout'
                });
            }

            CartService.getCartContents(cart.id, (err, items) => {
                if (err) {
                    console.error('Error al obtener items:', err);
                    return res.status(500).render('error', {
                        message: 'Error al cargar los items del carrito'
                    });
                }

                if (!items || items.length === 0) {
                    return res.redirect('/cart');
                }

                CartService.getCartTotal(cart.id, (err, total) => {
                    if (err) {
                        console.error('Error al calcular total:', err);
                        return res.status(500).render('error', {
                            message: 'Error al calcular el total'
                        });
                    }

                    res.render('checkout', {
                        title: 'Finalizar Compra',
                        items: items,
                        total: total ? total.total : 0,
                        userData: userData, // Datos disponibles del usuario
                        cartId: cart.id
                    });
                });
            });
        });
    });
});*/

// Ruta para mostrar la página de checkout
app.get('/checkout', checkAuth, (req, res) => {
    const userId = req.session.user.id;

    // Usar CartService para obtener el carrito
    CartService.getOrCreateCart(userId, (err, cart) => {
        if (err) {
            console.error('Error al obtener el carrito:', err);
            return res.status(500).render('error', {
                message: 'Error al cargar el checkout'
            });
        }
        //console.log('Carrito obtenido:', cart); 
        // Obtener contenidos del carrito
        CartService.getCartContents(cart.id, (err, items) => {
            if (err) {
                console.error('Error al obtener items del carrito:', err);
                return res.status(500).render('error', {
                    message: 'Error al cargar los items del carrito'
                });
            }
            //console.log('Items del carrito:', items);
            if (!items || items.length === 0) {
                return res.redirect('/cart');
            }

            // Obtener el total del carrito
            CartService.getCartTotal(cart.id, (err, total) => {
                if (err) {
                    console.error('Error al calcular el total:', err);
                    return res.status(500).render('error', {
                        message: 'Error al calcular el total'
                    });
                }
                //console.log('Total del carrito:', total); 
                // Renderizar la vista de checkout
                /*res.render('checkout', {
                    title: 'Finalizar Compra',
                    items: items,
                    total: total ? total.total : 0,
                    user: req.session.user,
                    cartId: cart.id
                });*/
                // Obtener el usuario de la base de datos
                db.get(
                    'SELECT name, email FROM users WHERE id = ?',
                    [userId],
                    (err, user) => {
                        if (err) {
                            console.error('Error al obtener datos del usuario:', err);
                            return res.status(500).render('error', {
                                message: 'Error al cargar datos del usuario'
                            });
                        }

                        res.render('checkout', {
                            title: 'Finalizar Compra',
                            items: items,
                            total: total ? total.total : 0,
                            user: user || {}, // Pasar datos del usuario o un objeto vacío
                            cartId: cart.id
                        });
                });
            });
        });
    });
});

// Ruta para procesar el pago
app.post('/process-payment', checkAuth, async (req, res) => {
    try {
        const { shippingInfo } = req.body;
        const userId = req.session.user.id;

        // Obtener el carrito actual
        const cart = await Cart.findOne({ userId })
            .populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Carrito vacío'
            });
        }

        // Crear la orden
        const order = new Order({
            userId,
            items: cart.items,
            total: cart.items.reduce((sum, item) => 
                sum + (item.quantity * item.productId.price), 0),
            shippingInfo,
            status: 'pending'
        });

        await order.save();

        // Limpiar el carrito
        await Cart.findOneAndUpdate(
            { userId },
            { $set: { items: [] } }
        );

        res.json({
            success: true,
            message: 'Pago procesado exitosamente',
            orderId: order._id
        });

    } catch (error) {
        console.error('Error al procesar el pago:', error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar el pago'
        });
    }
});

// Ruta para la confirmación de la orden
app.get('/order-confirmation/:orderId', checkAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('items.productId');

        if (!order) {
            return res.status(404).send('Orden no encontrada');
        }

        res.render('order-confirmation', {
            order,
            user: req.session.user
        });

    } catch (error) {
        console.error('Error al cargar la confirmación:', error);
        res.status(500).send('Error al cargar la confirmación de la orden');
    }
});


// Rutas para categorías
app.get('/categories', CategoryController.index);
app.get('/categories/create', CategoryController.create);
app.post('/categories', upload.single('image'), CategoryController.store);
app.get('/categories/:id', CategoryController.show);
app.get('/categories/:id/edit', CategoryController.edit);
app.post('/categories/:id', upload.single('image'),CategoryController.update);
app.post('/categories/:id/delete', CategoryController.delete);

// Rutas de productos
app.get('/products', ProductController.index);
app.get('/products/create', ProductController.create);
app.post('/products', upload.fields([{ name: 'thumbnail', maxCount: 1 },{ name: 'image1', maxCount: 1 },{ name: 'image2', maxCount: 1 }]), ProductController.store);
app.get('/products/:id', ProductController.show);
app.get('/products/:id/edit', ProductController.edit);
app.post('/products/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 },{ name: 'image1', maxCount: 1 },{ name: 'image2', maxCount: 1 }]),ProductController.update);
app.post('/products/:id/delete', ProductController.delete);
// Para renderizar una vista
//app.get('/products/featured', ProductController.featured);

// O para API
//app.get('/api/featured', ProductController.featuredApi);


// Rutas del carrito
app.get('/cart', CartController.viewCart);
app.post('/cart/add', CartController.addToCart);
app.post('/cart/update-quantity', CartController.updateQuantity);
app.post('/cart/remove/:itemId', CartController.removeItem);
app.post('/cart/clear', CartController.clearCart);

// Rutas de checkout (protegidas por autenticación)
app.get('/checkout', checkAuth, CheckoutController.viewCheckout);
app.post('/process-payment', checkAuth, CheckoutController.processPayment);
app.get('/order-confirmation/:orderId', checkAuth, CheckoutController.viewOrderConfirmation);

// Nuevas rutas para la tienda
// app.get('/products/:id', async (req, res, next) => {
//     try {
//         const product = await ProductService.getProductById(req.params.id);
//         if (!product) {
//             return res.status(404).render('error', { 
//                 message: 'Producto no encontrado' 
//             });
//         }
        
//         const relatedProducts = await ProductService.getProductsByCategory(product.categoryId);
//         res.render('products/detalle', {
//             product,
//             relatedProducts: relatedProducts.filter(p => p.id !== product.id).slice(0, 4)
//         });
//     } catch (error) {
//         next(error);
//     }
// });
// Ruta para ver detalle de producto
app.get('/product/:id', (req, res, next) => {
    const productId = req.params.id;
    
    // Obtener el producto con su información de categoría
    ProductService.getProductById(productId, (err, product) => {
        if (err) {
            console.error('Error al obtener producto:', err);
            return next(err);
        }
        
        if (!product) {
            return res.status(404).render('error', { 
                message: 'Producto no encontrado' 
            });
        }

        // Obtener productos relacionados de la misma categoría
        if (product.categoryId) {
            ProductService.getProductsByCategory(product.categoryId, (err, relatedProducts) => {
                const filteredRelated = relatedProducts 
                    ? relatedProducts.filter(p => p.id !== product.id).slice(0, 4)
                    : [];

                res.render('products/detalle', {
                    product: product,
                    relatedProducts: filteredRelated
                });
            });
        } else {
            res.render('products/detalle', {
                product: product,
                relatedProducts: []
            });
        }
    });
});

// app.get('/category/:id/products', async (req, res, next) => {
//     try {
//         const products = await ProductService.getProductsByCategory(req.params.id);
//         const category = await CategoryService.getCategoryById(req.params.id);
//         res.render('productos/catalogo', {
//             products,
//             category,
//             title: `Productos en ${category.name}`
//         });
//     } catch (error) {
//         next(error);
//     }
// });

// Ruta para categorías específicas
app.get('/category/:id/products', (req, res, next) => {
    const categoryId = req.params.id;
    
    // Obtener todas las categorías primero
    CategoryService.getAllCategories((catErr, categories) => {
        if (catErr) {
            console.error('Error al obtener categorías:', catErr);
            return next(catErr);
        }

        // Obtener la categoría específica
        CategoryService.getCategoryById(categoryId, (err, category) => {
            if (err) {
                console.error('Error al obtener categoría:', err);
                return next(err);
            }

            if (!category) {
                return res.status(404).render('error', {
                    message: 'Categoría no encontrada'
                });
            }

            // Obtener los productos de la categoría
            ProductService.getProductsByCategory(categoryId, (prodErr, products) => {
                if (prodErr) {
                    console.error('Error al obtener productos:', prodErr);
                    return next(prodErr);
                }

                res.render('products/catalogo', {
                    title: `Productos en ${category.name}`,
                    category: category,
                    categories: categories || [],
                    products: products || [],
                    searchTerm: null
                });
            });
        });
    });
});

// app.get('/search', async (req, res, next) => {
//     try {
//         const searchTerm = req.query.q;
//         const products = await ProductService.searchProducts(searchTerm);
//         res.render('productos/catalogo', {
//             products,
//             searchTerm,
//             title: `Resultados para: ${searchTerm}`
//         });
//     } catch (error) {
//         next(error);
//     }
// });

// Ruta de búsqueda
app.get('/search', (req, res, next) => {
    const searchTerm = req.query.q || '';
    
    CategoryService.getAllCategories((catErr, categories) => {
        if (catErr) {
            console.error('Error al obtener categorías:', catErr);
            return next(catErr);
        }

        ProductService.searchProducts(searchTerm, (prodErr, products) => {
            if (prodErr) {
                console.error('Error al buscar productos:', prodErr);
                return next(prodErr);
            }

            res.render('products/catalogo', {
                title: `Búsqueda: ${searchTerm}`,
                categories: categories || [],
                products: products || [],
                searchTerm: searchTerm,
                category: null
            });
        });
    });
});
// API endpoints para operaciones AJAX
app.get('/api/products', async (req, res) => {
    try {
        const products = await ProductService.getAllProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/category/:id', async (req, res) => {
    try {
        const products = await ProductService.getProductsByCategory(req.params.id);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/search', async (req, res) => {
    try {
        const products = await ProductService.searchProducts(req.query.q);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// En app.js para obtener todas las categorias
app.get('/api/categories', async (req, res) => {
    try {
      const categories = await CategoryService.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Ruta de inicio
app.get('/inicio', InicioController.index);

// Manejo de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Página no encontrada' 
    });
});
/***************INICIOOOOO************** */


app.get('/', async (req, res) => {
    try {
        // Obtener los productos
        ProductService.getAllProducts((err, products) => {
            if (err) {
                console.error('Error:', err);
                return res.status(500).send('Error al cargar los productos');
            }

            // Obtener las categorías
            CategoryService.getAll((err, categories) => {
                if (err) {
                    console.error('Error:', err);
                    return res.status(500).send('Error al cargar las categorías');
                }

                // Renderizar la vista con todos los datos necesarios
                res.render('inicio/index', { 
                    products: products,
                    categories: categories,
                    title: 'GoGo Play - Inicio',
                    user: req.session.user || null // Pasar el usuario de la sesión
                });
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar la página');
    }
});
/*app.get('/', async (req, res) => {
  try {
      // Obtener todos los productos usando el servicio
      ProductService.getAllProducts((err, products) => {
          if (err) {
              console.error('Error:', err);
              return res.status(500).send('Error al cargar los productos');
          }
          // Renderizar la vista inicio.pug con los productos
          res.render('inicio', { 
              products: products,
              title: 'Catálogo de Productos'
          });
      });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Error al cargar la página');
  }
});*/

/*
app.get('/', (req, res) => {
    // Obtener categorías y productos
    CategoryService.getAll((err, categories) => {
        if (err) return next(err);
        
        ProductService.getFeatured((err, products) => {
            if (err) return next(err);
            
            res.render('inicio/index', {
                title: 'GoGo Play - Inicio',
                categories: categories,
                products: products,
                user: req.session.user, // Asegurarte de pasar el usuario
                cartItemCount: res.locals.cartItemCount
            });
        });
    });
});*/

/************MOSTRAR PRODUCTO A DETALLE************* */
// Añade esto en tu app.js
// Actualiza o agrega esta ruta en tu app.js
app.get('/product/:id', (req, res) => {
  ProductService.getProductById(req.params.id, (err, product) => {
      if (err) {
          console.error('Error:', err);
          return res.render('error', { 
              message: 'Error al cargar el producto',
              error: err
          });
      }
      
      if (!product) {
          return res.render('error', { 
              message: 'Producto no encontrado'
          });
      }

      // Si el producto existe, cargar productos relacionados
      if (product.categoryId) {
          ProductService.getProductsByCategory(product.categoryId, (err, relatedProducts) => {
              if (err) {
                  // Si hay error en productos relacionados, mostrar solo el producto principal
                  return res.render('products/detalle', { product });
              }
              
              // Filtrar el producto actual y limitar a 4 productos relacionados
              const filteredRelated = relatedProducts
                  .filter(p => p.id !== product.id)
                  .slice(0, 4);
              
              res.render('products/detalle', { 
                  product,
                  relatedProducts: filteredRelated
              });
          });
      } else {
          // Si no hay categoría, mostrar solo el producto
          res.render('products/detalle', { product });
      }
  });
});


// Middleware para manejar errores 404 (rutas no encontradas)
app.use((req, res, next) => {
  res.status(404).render('error', { message: 'Página no encontrada' });
});  
  app.use(multerErrorHandler);

// Middleware para manejar otros errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
      message: 'Algo salió mal',
      error: process.env.NODE_ENV === 'development' ? err : {}
  });
});
const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});