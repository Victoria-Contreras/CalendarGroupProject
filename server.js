const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const Sequelize = require('sequelize');
const { Op } = require('sequelize');

const { User } = require('./models');
const { Event } = require('./models');

const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
    session({
       secret: 'secret',
       resave: false,
       saveUninitialized: true,
       cookie: {
        secure: false,
        maxAge: 2592000000,
       } 
    })
  );
  
//middleware for login check
app.use('/calendar',function(req, res, next) {
if (req.session.user == null){
    console.log("Redirect Middleware");
    return res.render('login');
} else{
    next();
}
});

//test for accessibility
app.get('/heartbeat', (req, res) => {
    res.json({
        "is": "working"
    })
});

//login routes
app.get('/login', async (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const user = await User.findAll({
        where: {
            username: {
                [Op.eq]: req.body.username
            }
        }
    });

    bcrypt.compare(req.body.passphrase, user[0].password, function (err, result) {
        if ((result) && (req.body.username === user[0].username)) {
            req.session.user = req.body.username;
            res.redirect('/calendar/home');
        } else {
            res.redirect('/failed_login');
        }
    });
});

app.get('/failed_login', async (req, res) => {
    res.render('failed_login');
});

app.get('/create_account', async (req, res) => {
    res.render('create_account');
});

app.post('/create_account', async (req, res) => {
    const user = await User.findAll({
        where: {
            username: {
                [Op.eq]: req.body.username
            }
        }
    });
    if (user[0] == null) {
        bcrypt.hash(req.body.passphrase, 10, function (err, hash) {
            User.create({ username: req.body.username, password: hash });
        });
        res.redirect('/calendar/home');
    } else {
        res.render('failed_create');
    }
});

app.get('/failed_create', async (req, res) => {
    res.render('failed_create');
});

// Main app routes
app.get('/', async(req, res) => {
    res.redirect('/calendar/home');
});

app.get("/calendar/home", async (req, res) => {
    const events = await Event.findAll();
    res.send(events)
})

app.post("/calendar/new-event", async (req, res) => {
    try {
        const newEvent = await Event.create({
            date: Sequelize.literal('CURRENT_TIMESTAMP'),
            title: req.body.title, 
            description: req.body.description,

        })
        res.send("Event Added")
    } catch (error) {
        res.send('Error')
    }
})

app.put("/calendar/modify-event/:id", async (req, res) => {
    const event = await Event.findByPk(req.params.id)
    event.set({
        date: Sequelize.literal('CURRENT_TIMESTAMP'),
        title: req.body.title,
        description: req.body.description
    })
    await event.save();
    res.send(event)
})

app.delete('/calendar/delete-event/:id', async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.id)
        event.destroy()
        res.send('DELETED')
    } catch (error) {
        res.send("error")
    }
})
app.listen(3000)