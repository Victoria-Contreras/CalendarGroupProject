//include modules
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const methodOverride = require('method-override')
const {Sequelize} = require('sequelize');
const sequelize = new Sequelize('postgres://calendar_db_user:30ky2h8MCvetcI60wTj8KLzj9lfGRV6M@dpg-cf87e2pgp3jqqerb0sg0-a/calendar_db')
const { Op } = require('sequelize');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
//sequelize models
const { User } = require('./models');
const { Event } = require('./models');
const { UserEvent } = require('./models');
//ejs view and static paths
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
//route parsing 
app.use(express.urlencoded({ extended: true }));    
app.use(express.json());
app.use(methodOverride('_method'));
//session settings
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

app.get('/logout', async (req, res) => {
    req.session.destroy();
    res.render('login');
});

//App routes

//index
app.get('/', async(req, res) => {
    res.redirect('/calendar/home');
});

//home
app.get("/calendar/home", async (req, res) => {
    const eventsCreator = await Event.findAll({
        where: {
            id: {
                [Op.in]:  
                        Sequelize.literal(`(SELECT "eventID" FROM "UserEvents" WHERE username='${req.session.user}' and creator=true)`)
            }
        },
        order: [
            [Sequelize.literal('date'), 'ASC']
        ]
    });

    const eventsInvitee = await Event.findAll({
        where: {
            id: {
                [Op.in]:  
                        Sequelize.literal(`(SELECT "eventID" FROM "UserEvents" WHERE username='${req.session.user}' and creator=false)`)
            }
        },
        order: [
            [Sequelize.literal('date'), 'ASC']
        ]
    });
    
    res.render('home', {eventsCreator: eventsCreator, eventsInvitee: eventsInvitee});
})

//create new event
app.get("/calendar/new-event", async (req, res) => {
    const users = await User.findAll({
        where: {
            username: {
                [Op.notIn]: [req.session.user]
            }
        }
    });
    res.render('create_event', {users: users});
})

app.post("/calendar/new-event", async (req, res) => {
    const eventDate = new Date(req.body.eventDate);
    try {
        const newEvent = await Event.create({
            date: eventDate,
            title: req.body.title, 
            description: req.body.description,
        })
        .then(async(data) => {
            const newUserEvent = await UserEvent.create({
                username: req.session.user,
                eventID: data.id,
                creator: true
            });
            return newUserEvent;
        })
        .then(async(userevent) => {
            if(typeof(req.body.invitees)==='object') {
                for(let i=0; i < req.body.invitees.length; i++) {
                    await UserEvent.create({
                        username: req.body.invitees[i],
                        eventID: userevent.eventID,
                        creator: false
                    });
                }
            } else if(typeof(req.body.invitees)==='string') {
                await UserEvent.create({
                    username: req.body.invitees,
                    eventID: userevent.eventID,
                    creator: false
                });
            }
            res.redirect('/calendar/home');
        })
    } catch (error) {
        res.send(error);
    }
})

//modify event
app.get("/calendar/modify-event/:id", async (req, res) => {
    const event = await Event.findByPk(req.params.id)

    const users = await User.findAll({
        where: {
            username: {
                [Op.notIn]: [req.session.user]
            }
        }
    });
    let eventdate = event.date;
    let charDate = (`${eventdate.getFullYear()}-${("0"+(eventdate.getMonth()+1)).slice(-2)}-${("0"+(eventdate.getDate())).slice(-2)}T${("0"+(eventdate.getHours())).slice(-2)}:${("0"+(eventdate.getMinutes())).slice(-2)}:${("0"+(eventdate.getSeconds())).slice(-2)}`);
    res.render('edit_event',{event: event, users: users, charDate: charDate});
})

app.put("/calendar/modify-event/:id", async (req, res) => {
    const event = await Event.findByPk(req.params.id)
    event.set({
        date: req.body.eventDate,
        title: req.body.title,
        description: req.body.description
    })
    await event.save();
    await UserEvent.destroy({
        where: {
            eventID: `${req.params.id}`,
            creator: false
        }
    })
    if(typeof(req.body.invitees)==='object') {
        for(let i=0; i < req.body.invitees.length; i++) {
            await UserEvent.create({
                username: req.body.invitees[i],
                eventID: event.id,
                creator: false
            });
        }
    } else if(typeof(req.body.invitees)==='string') {
        await UserEvent.create({
            username: req.body.invitees,
            eventID: event.id,
            creator: false
        });
    }
    res.redirect('/calendar/home');
})

//delete event
app.delete('/calendar/delete-event/:id', async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.id);
        event.destroy();
        await UserEvent.destroy({
            where: {
                eventID: `${req.params.id}`
            }
        })
        res.redirect('/calendar/home');
    } catch (error) {
        res.send("error");
    }
})

//listen on port 3000
app.listen(3000)