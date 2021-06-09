var express = require("express");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");
const { DateTime } = require("luxon");
const exphbs = require("express-handlebars");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

//helpers for handlebars
var hbs = exphbs.create({
  // Specify helpers which are only registered on this instance.
  helpers: {
    noteCount: function (notes) {
      return notes.length;
    }
  }
});
// Set Handlebars as the default templating engine.
app.engine("handlebars", hbs.engine); //exphbs({ defaultLayout: "main" })
app.set("view engine", "handlebars");

var MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true
});

// Routes

// A GET route for scraping the echoJS website
app.get("/", function (req, res) {
  db.Article.find({})
    .sort({ _id: -1 })
    .lean()
    .then(function (dbArticles) {
      res.render("index", { articles: dbArticles });
    })
    .catch(function (err) {
      console.log(err);
      res.send("Database read error");
    });
});

app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.nbcnews.com/latest-stories").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    results = [];
    // Now, we grab every h2 within an article tag, and do the following:
    $("div.wide-tease-item__info-wrapper").each(function (i, element) {
      // Save an empty results object
      result = {};

      result.title = $(this).children("a").children("h2").text().trim();
      result.link = $(this).children("a").attr("href").trim();
      result.desc = $(this)
        .children()
        .children("div.wide-tease-item__description")
        .text();
      let dt = DateTime.now();
      result.articleDate = dt.toLocaleString(DateTime.DATE_FULL).toString();

      if (result.link && result.title) {
        results.push(result);
        // Create a new Article using the `results` object built from scraping
        // No previously scraped articles will be added due to unique key in database
        db.Article.insertMany(results, { ordered: false })
          .then(function (dbInsertedArticles) {
            //query the database to get all (including previously scraped) articles and then
            //render it to index handlbar.
            res.json(dbInsertedArticles);
          })
          .catch(function (err) {
            //if it is not a duplicate key error, which is fine because we don't want to duplicate articles
            if (err.code !== 11000) {
              console.log(err);
            }
            if (!res.headersSent) {
              res.json(err);
            }
          });
      }
    });
  });
});
// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/article/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("notes")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Notes
app.post("/article/:id", function (req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function (dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the results of the query
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { notes: dbNote._id } },
        { new: true }
      );
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.delete("/api/deletenote/:id", function (req, res) {
  // Remove a note using the objectID
  db.Note.deleteOne({
    _id: req.params.id
  })
    .then(function (dbNote) {
      //delete the reference to the note in the Article
      db.Article.findOneAndUpdate(
        { notes: req.params.id },
        { $pull: { notes: req.params.id } },
        { new: true }
      ).then(function (articleAfterUpdate) {
        console.log(articleAfterUpdate);
      });
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbNote);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
